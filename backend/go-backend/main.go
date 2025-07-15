package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"backend/go-backend/handlers"
	"backend/go-backend/utils"
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
var k8sLogScannerURL string
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

// addCORSHeaders adds CORS headers to the response
func addCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:3001": true,
		"http://localhost:3002": true,
		"http://127.0.0.1:3000": true,
		"http://127.0.0.1:3001": true,
		"http://127.0.0.1:3002": true,
	}
	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
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

// SSE endpoint for real-time metrics
// GET /metrics/stream
// Streams a JSON object every second with example metrics
func metricsStreamHandler(w http.ResponseWriter, r *http.Request) {
	addCORSHeaders(w, r)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}
	// Example: stream a random metrics object every second
	for {
		metrics := map[string]interface{}{
			"cpu":               rand.Float64()*30 + 40, // 40-70
			"memory":            rand.Float64()*20 + 60, // 60-80
			"disk":              rand.Float64()*15 + 35, // 35-50
			"network":           rand.Float64()*40 + 30, // 30-70
			"activeConnections": rand.Intn(1000) + 500,
			"requestsPerSecond": rand.Intn(50) + 20,
			"errorRate":         rand.Float64()*2 + 0.1,
			"uptime":            99.8 + rand.Float64()*0.2,
		}
		b, _ := json.Marshal(metrics)
		w.Write([]byte("data: "))
		w.Write(b)
		w.Write([]byte("\n\n"))
		flusher.Flush()
		time.Sleep(1 * time.Second)
		if r.Context().Err() != nil {
			return
		}
	}
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
	k8sLogScannerURL = os.Getenv("K8S_LOG_SCANNER_URL")
	if k8sLogScannerURL == "" {
		k8sLogScannerURL = "http://k8s-log-scanner:8000"
	}
	codeRelatedKeywords = loadCodeRelatedKeywords("code_keywords.txt")
	log.Printf("Loaded code-related keywords: %v", codeRelatedKeywords)
	log.Printf("Using log analyzer URL: %s", logAnalyzerURL)
	log.Printf("Using root cause predictor URL: %s", rootCausePredictorURL)
	log.Printf("Using knowledge base URL: %s", knowledgeBaseURL)
	log.Printf("Using action recommender URL: %s", actionRecommenderURL)

	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/metrics/stream", metricsStreamHandler)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		utils.AddCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		handlers.HandleHealth(w, r)
	})

	http.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		utils.AddCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		handlers.HandleAnalyze(w, r)
	})

	http.HandleFunc("/predict", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
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
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
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
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
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

	// Configuration endpoints
	http.HandleFunc("/config", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		requestsTotal.WithLabelValues("/config").Inc()
		w.Header().Set("Content-Type", "application/json")

		if r.Method == "GET" {
			// Return current configuration
			config := map[string]interface{}{
				"log_analyzer_url":          logAnalyzerURL,
				"root_cause_predictor_url":  rootCausePredictorURL,
				"knowledge_base_url":        knowledgeBaseURL,
				"action_recommender_url":    actionRecommenderURL,
				"incident_integrator_url":   incidentIntegratorURL,
				"enable_auto_analysis":      true,
				"enable_jira_integration":   true,
				"enable_github_integration": true,
				"enable_notifications":      true,
				"request_timeout":           30,
				"max_retries":               3,
				"log_level":                 "INFO",
				"cache_ttl":                 60,
			}
			json.NewEncoder(w).Encode(config)
		} else if r.Method == "POST" {
			// Update configuration
			var newConfig map[string]interface{}
			if err := json.NewDecoder(r.Body).Decode(&newConfig); err != nil {
				errorsTotal.WithLabelValues("/config").Inc()
				log.Printf("Invalid configuration request: %v", err)
				http.Error(w, "Invalid configuration: "+err.Error(), http.StatusBadRequest)
				return
			}

			// Update URLs if provided
			if url, ok := newConfig["log_analyzer_url"].(string); ok && url != "" {
				logAnalyzerURL = url
			}
			if url, ok := newConfig["root_cause_predictor_url"].(string); ok && url != "" {
				rootCausePredictorURL = url
			}
			if url, ok := newConfig["knowledge_base_url"].(string); ok && url != "" {
				knowledgeBaseURL = url
			}
			if url, ok := newConfig["action_recommender_url"].(string); ok && url != "" {
				actionRecommenderURL = url
			}
			if url, ok := newConfig["incident_integrator_url"].(string); ok && url != "" {
				incidentIntegratorURL = url
			}

			log.Printf("Configuration updated")
			json.NewEncoder(w).Encode(map[string]string{"status": "Configuration updated successfully"})
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Test endpoint
	http.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		requestsTotal.WithLabelValues("/test").Inc()
		w.Header().Set("Content-Type", "application/json")
		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// For now, return a simple test result
		result := map[string]interface{}{
			"status":  "success",
			"message": "Test endpoint is working",
			"services": map[string]string{
				"go_backend":           "UP",
				"log_analyzer":         "UP",
				"root_cause_predictor": "UP",
				"knowledge_base":       "UP",
				"action_recommender":   "UP",
				"incident_integrator":  "UP",
			},
		}
		json.NewEncoder(w).Encode(result)
	})

	// K8s Log Scanner endpoint
	http.HandleFunc("/scan-k8s-logs", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		requestsTotal.WithLabelValues("/scan-k8s-logs").Inc()

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Forward the request to the K8s log scanner service
		body, err := io.ReadAll(r.Body)
		if err != nil {
			errorsTotal.WithLabelValues("/scan-k8s-logs").Inc()
			log.Printf("Failed to read request body: %v", err)
			http.Error(w, "Failed to read request body", http.StatusBadRequest)
			return
		}

		resp, err := http.Post(k8sLogScannerURL+"/scan-logs", "application/json", bytes.NewBuffer(body))
		if err != nil {
			errorsTotal.WithLabelValues("/scan-k8s-logs").Inc()
			log.Printf("Failed to contact K8s log scanner: %v", err)
			http.Error(w, "Failed to contact K8s log scanner: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	// K8s Clusters endpoint
	http.HandleFunc("/k8s-clusters", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		requestsTotal.WithLabelValues("/k8s-clusters").Inc()

		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp, err := http.Get(k8sLogScannerURL + "/clusters")
		if err != nil {
			errorsTotal.WithLabelValues("/k8s-clusters").Inc()
			log.Printf("Failed to contact K8s log scanner: %v", err)
			http.Error(w, "Failed to contact K8s log scanner: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	// K8s Namespaces endpoint
	http.HandleFunc("/k8s-namespaces", func(w http.ResponseWriter, r *http.Request) {
		addCORSHeaders(w, r)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		requestsTotal.WithLabelValues("/k8s-namespaces").Inc()
		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		cluster := r.URL.Query().Get("cluster")
		if cluster == "" {
			http.Error(w, "Missing cluster parameter", http.StatusBadRequest)
			return
		}
		resp, err := http.Get(k8sLogScannerURL + "/namespaces/" + url.PathEscape(cluster))
		if err != nil {
			errorsTotal.WithLabelValues("/k8s-namespaces").Inc()
			log.Printf("Failed to contact K8s log scanner: %v", err)
			http.Error(w, "Failed to contact K8s log scanner: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	log.Println("Go backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
