package handlers

import (
	"encoding/json"
	"net/http"

	"backend/go-backend/logger"
	"backend/go-backend/models"
	"backend/go-backend/services"
)

// Refactored handler: injects AnalyzeService
func HandleAnalyze(analyzeService services.AnalyzeService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Analyze] Analyze endpoint called from ", r.RemoteAddr)
		var req models.LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Error("[Analyze] Invalid analyze request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		result, err := analyzeService.AnalyzeLog(req)
		if err != nil {
			logger.Logger.Error("[Analyze] Analysis failed: ", err)
			http.Error(w, "Analysis failed", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(result); err != nil {
			logger.Logger.Error("[Analyze] Failed to encode analyze response:", err)
		}
	}
}
