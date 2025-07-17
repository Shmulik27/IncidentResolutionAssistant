package handlers

import (
	"backend/go-backend/logger"
	"encoding/json"
	"net/http"
)

// HealthService abstracts health check operations for handlers
type HealthService interface {
	HealthStatus() map[string]string
}

// DefaultHealthService implements HealthService using current logic
// (for backward compatibility; refactor internals as needed)
type DefaultHealthService struct{}

// HealthStatus returns the health status of the service
func (s DefaultHealthService) HealthStatus() map[string]string {
	return map[string]string{"status": "ok"}
}

// Refactored handler: injects HealthService
func HandleHealth(healthService HealthService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Health] Health check endpoint hit from ", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(healthService.HealthStatus()); err != nil {
			logger.Logger.Error("[Health] Failed to write response: ", err)
		}
	}
}
