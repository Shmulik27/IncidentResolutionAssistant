package handlers

import (
	"encoding/json"
	"net/http"

	"backend/go-backend/logger"
	"backend/go-backend/models"
)

func HandleAnalyze(w http.ResponseWriter, r *http.Request) {
	logger.Logger.Info("[Analyze] Analyze endpoint called from ", r.RemoteAddr)
	var req models.LogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Logger.Error("[Analyze] Invalid analyze request: ", err)
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	// TODO: Call business logic and write response
	if _, err := w.Write([]byte(`{"result": "ok"}`)); err != nil {
		logger.Logger.Error("[Analyze] Failed to write response: ", err)
	}
}
