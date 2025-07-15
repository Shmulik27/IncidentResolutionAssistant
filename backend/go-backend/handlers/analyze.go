package handlers

import (
	"backend/go-backend/models"
	"encoding/json"
	"net/http"
)

func HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	var req models.LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	// TODO: Call business logic and write response
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"result": "ok"}`))
}
