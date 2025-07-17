package handlers

import (
	"backend/go-backend/services"
	"net/http"
)

// Refactored handler: injects MetricsService
func MetricsStreamHandler(metricsService services.MetricsService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		metricsService.StreamMetrics(w, r)
	}
}
