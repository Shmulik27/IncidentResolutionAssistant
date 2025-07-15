package handlers

import (
	"backend/go-backend/models"
	"encoding/json"
	"log"
	"net/http"
)

func HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req models.LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	// TODO: Call business logic and write response
	if _, err := w.Write([]byte(`{"result": "ok"}`)); err != nil {
		log.Printf("failed to write response: %v", err)
	}
}
