package handlers

import (
	"backend/go-backend/logger"
	"backend/go-backend/services/health"
	"encoding/json"
	"net/http"
)

// Refactored handler: injects HealthService
func HandleHealth(healthService health.HealthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Health] Health check endpoint hit from ", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(healthService.HealthStatus()); err != nil {
			logger.Logger.Error("[Health] Failed to write response: ", err)
		}
	}
}
