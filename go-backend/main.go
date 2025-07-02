package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
)

type LogRequest struct {
	Logs []string `json:"logs"`
}

func main() {
	http.HandleFunc("/analyze", func(w http.ResponseWriter, r *http.Request) {
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// Forward to Python log analyzer
		body, _ := json.Marshal(req)
		resp, err := http.Post("http://log-analyzer:8000/analyze", "application/json", bytes.NewBuffer(body))
		if err != nil {
			http.Error(w, "Failed to contact log analyzer", http.StatusInternalServerError)
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

	http.ListenAndServe(":8080", nil)
}
