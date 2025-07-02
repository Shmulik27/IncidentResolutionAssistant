package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
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
	log.Printf("Using log analyzer URL: %s", logAnalyzerURL)
	log.Printf("Using root cause predictor URL: %s", rootCausePredictorURL)
	log.Printf("Using knowledge base URL: %s", knowledgeBaseURL)
	log.Printf("Using action recommender URL: %s", actionRecommenderURL)

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	http.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			log.Printf("Missing 'logs' field in request")
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /analyze request with %d log lines", len(req.Logs))

		// Forward to Python log analyzer
		body, _ := json.Marshal(req)
		resp, err := http.Post(logAnalyzerURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
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
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			log.Printf("Missing 'logs' field in request")
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /predict request with %d log lines", len(req.Logs))

		// Forward to Python root cause predictor
		body, _ := json.Marshal(req)
		resp, err := http.Post(rootCausePredictorURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
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
		var req SearchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.Query == "" {
			log.Printf("Missing 'query' field in request")
			http.Error(w, "Missing 'query' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /search request with query: %s", req.Query)

		body, _ := json.Marshal(req)
		resp, err := http.Post(knowledgeBaseURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
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
		var req RecommendRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			log.Printf("Invalid request: %v", err)
			http.Error(w, "Invalid request: "+err.Error(), http.StatusBadRequest)
			return
		}
		if req.RootCause == "" {
			log.Printf("Missing 'root_cause' field in request")
			http.Error(w, "Missing 'root_cause' field", http.StatusBadRequest)
			return
		}
		log.Printf("Received /recommend request with root cause: %s", req.RootCause)

		body, _ := json.Marshal(req)
		resp, err := http.Post(actionRecommenderURL, "application/json", bytes.NewBuffer(body))
		if err != nil {
			log.Printf("Failed to contact action recommender: %v", err)
			http.Error(w, "Failed to contact action recommender: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	log.Println("Go backend listening on :8080")
	http.ListenAndServe(":8080", nil)
}
