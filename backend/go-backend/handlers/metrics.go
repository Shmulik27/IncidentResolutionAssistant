package handlers

import (
	"backend/go-backend/services/metrics"
	"net/http"
)

// Refactored handler: injects MetricsService
func MetricsStreamHandler(metricsService metrics.MetricsService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		metricsService.StreamMetrics(w, r)
	}
}
