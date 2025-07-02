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

var logAnalyzerURL string

func main() {
	logAnalyzerURL = os.Getenv("LOG_ANALYZER_URL")
	if logAnalyzerURL == "" {
		logAnalyzerURL = "http://log-analyzer:8000/analyze"
	}
	log.Printf("Using log analyzer URL: %s", logAnalyzerURL)

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
		json.NewEncoder(w).Encode(map[string]string{"result": "Root cause prediction not implemented yet."})
	})

	http.HandleFunc("/search", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"result": "Knowledge base search not implemented yet."})
	})

	http.HandleFunc("/recommend", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"result": "Action recommendation not implemented yet."})
	})

	log.Println("Go backend listening on :8080")
	http.ListenAndServe(":8080", nil)
}
