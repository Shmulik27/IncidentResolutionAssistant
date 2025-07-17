package handlers

import (
	"encoding/json"
	"net/http"

	"backend/go-backend/logger"
	"backend/go-backend/models"
)

// AnalyzeService abstracts log analysis operations for handlers
type AnalyzeService interface {
	AnalyzeLog(req models.LogRequest) (map[string]interface{}, error)
}

// DefaultAnalyzeService implements AnalyzeService using current logic
// (for backward compatibility; refactor internals as needed)
type DefaultAnalyzeService struct{}

// AnalyzeLog performs log analysis for the given request
func (s DefaultAnalyzeService) AnalyzeLog(req models.LogRequest) (map[string]interface{}, error) {
	// TODO: Replace with real analysis logic or microservice call
	return map[string]interface{}{"result": "ok"}, nil
}

// Refactored handler: injects AnalyzeService
func HandleAnalyze(analyzeService AnalyzeService) http.HandlerFunc {
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
		json.NewEncoder(w).Encode(result)
	}
}
