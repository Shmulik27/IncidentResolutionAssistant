package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type LogRequest struct {
	Logs []string `json:"logs"`
}

type SearchRequest struct {
	Query string `json:"query"`
	TopK  int    `json:"top_k"`
}

type RecommendRequest struct {
	RootCause string `json:"root_cause"`
}

var logAnalyzerURL string
var rootCausePredictorURL string
var knowledgeBaseURL string
var actionRecommenderURL string
var incidentIntegratorURL string
var codeRelatedKeywords []string

// Prometheus metrics
var (
	requestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "go_backend_requests_total",
			Help: "Total requests to Go backend endpoints",
		},
		[]string{"endpoint"},
	)
	errorsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "go_backend_errors_total",
			Help: "Total errors in Go backend endpoints",
		},
		[]string{"endpoint"},
	)
)

func init() {
	prometheus.MustRegister(requestsTotal)
	prometheus.MustRegister(errorsTotal)
}

func loadCodeRelatedKeywords(path string) []string {
	file, err := os.Open(path)
	if err != nil {
		log.Printf("Could not open code keywords config: %v", err)
		return []string{"exception", "fault", "error", "regression", "crash", "panic"} // fallback defaults
	}
	defer file.Close()
	var keywords []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		kw := strings.TrimSpace(scanner.Text())
		if kw != "" && !strings.HasPrefix(kw, "#") {
			keywords = append(keywords, kw)
		}
	}
	return keywords
}

func isCodeRelated(rootCause string) bool {
	for _, keyword := range codeRelatedKeywords {
		if strings.Contains(strings.ToLower(rootCause), strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

func main() {
	logAnalyzerURL = os.Getenv("LOG_ANALYZER_URL")
	if logAnalyzerURL == "" {
		logAnalyzerURL = "http://log-analyzer:8000/analyze"
	}
	rootCausePredictorURL = os.Getenv("ROOT_CAUSE_PREDICTOR_URL")
	if rootCausePredictorURL == "" {
		rootCausePredictorURL = "http://root-cause-predictor:8000/predict"
	}
	knowledgeBaseURL = os.Getenv("KNOWLEDGE_BASE_URL")
	if knowledgeBaseURL == "" {
		knowledgeBaseURL = "http://knowledge-base:8000/search"
	}
	actionRecommenderURL = os.Getenv("ACTION_RECOMMENDER_URL")
	if actionRecommenderURL == "" {
		actionRecommenderURL = "http://action-recommender:8000/recommend"
	}
	incidentIntegratorURL = os.Getenv("INCIDENT_INTEGRATOR_URL")
	if incidentIntegratorURL == "" {
		incidentIntegratorURL = "http://incident-integrator:8000/incident"
	}
	codeRelatedKeywords = loadCodeRelatedKeywords("code_keywords.txt")
	log.Printf("Loaded code-related keywords: %v", codeRelatedKeywords)
	log.Printf("Using log analyzer URL: %s", logAnalyzerURL)
	log.Printf("Using root cause predictor URL: %s", rootCausePredictorURL)
	log.Printf("Using knowledge base URL: %s", knowledgeBaseURL)
	log.Printf("Using action recommender URL: %s", actionRecommenderURL)

	http.Handle("/metrics", promhttp.Handler())

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		requestsTotal.WithLabelValues("/health").Inc()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	http.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		requestsTotal.WithLabelValues("/analyze").Inc()
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorsTotal.WithLabelValues("/analyze").Inc()
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			errorsTotal.WithLabelValues("/analyze").Inc()
			log.Printf("Missing 'logs' field in request")
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /analyze request with %d log lines", len(req.Logs))

		body, _ := json.Marshal(req)
		resp, err := http.Post(logAnalyzerURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			errorsTotal.WithLabelValues("/analyze").Inc()
			log.Printf("Failed to contact log analyzer: %v", err)
			http.Error(w, "Failed to contact log analyzer: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/predict", func(w http.ResponseWriter, r *http.Request) {
		requestsTotal.WithLabelValues("/predict").Inc()
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorsTotal.WithLabelValues("/predict").Inc()
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			errorsTotal.WithLabelValues("/predict").Inc()
			log.Printf("Missing 'logs' field in request")
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /predict request with %d log lines", len(req.Logs))

		body, _ := json.Marshal(req)
		resp, err := http.Post(rootCausePredictorURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			errorsTotal.WithLabelValues("/predict").Inc()
			log.Printf("Failed to contact root cause predictor: %v", err)
			http.Error(w, "Failed to contact root cause predictor: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		requestsTotal.WithLabelValues("/search").Inc()
		var req SearchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorsTotal.WithLabelValues("/search").Inc()
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Query == "" {
			errorsTotal.WithLabelValues("/search").Inc()
			log.Printf("Missing 'query' field in request")
			http.Error(w, "Missing 'query' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /search request with query: %s", req.Query)

		body, _ := json.Marshal(req)
		resp, err := http.Post(knowledgeBaseURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			errorsTotal.WithLabelValues("/search").Inc()
			log.Printf("Failed to contact knowledge base: %v", err)
			http.Error(w, "Failed to contact knowledge base: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	http.HandleFunc("/recommend", func(w http.ResponseWriter, r *http.Request) {
		requestsTotal.WithLabelValues("/recommend").Inc()
		var req RecommendRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			errorsTotal.WithLabelValues("/recommend").Inc()
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.RootCause == "" {
			errorsTotal.WithLabelValues("/recommend").Inc()
			log.Printf("Missing 'root_cause' field in request")
			http.Error(w, "Missing 'root_cause' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /recommend request with root cause: %s", req.RootCause)

		body, _ := json.Marshal(req)
		resp, err := http.Post(actionRecommenderURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			errorsTotal.WithLabelValues("/recommend").Inc()
			log.Printf("Failed to contact action recommender: %v", err)
			http.Error(w, "Failed to contact action recommender: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)

		// After the end-to-end flow, trigger the Incident Integrator if code-related
		if isCodeRelated(req.RootCause) {
			incident := map[string]interface{}{
				"error_summary": req.RootCause,
				"error_details": req.RootCause, // You can expand this with more context if available
				"file_path":     "",            // Fill if you have this info
				"line_number":   0,             // Fill if you have this info
			}
			incidentBody, _ := json.Marshal(incident)
			go func() {
				resp, err := http.Post(incidentIntegratorURL, "application/json", bytes.NewBuffer(incidentBody))
				if err != nil {
					log.Printf("Failed to notify Incident Integrator: %v", err)
					return
				}
				defer resp.Body.Close()
				log.Printf("Incident Integrator notified, status: %v", resp.Status)
			}()
		}
	})

	log.Println("Go backend listening on :8080")
	http.ListenAndServe(":8080", nil)
}
