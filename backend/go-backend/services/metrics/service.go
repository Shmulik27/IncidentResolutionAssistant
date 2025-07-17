package metrics

import (
	"encoding/json"
	"math/rand"
	"net/http"
	"time"
)

// MetricsService abstracts metrics streaming operations for handlers
type MetricsService interface {
	StreamMetrics(w http.ResponseWriter, r *http.Request)
}

// DefaultMetricsService implements MetricsService using current logic
type DefaultMetricsService struct{}

func (s DefaultMetricsService) StreamMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported!", http.StatusInternalServerError)
		return
	}
	for {
		metrics := map[string]interface{}{
			"cpu":               rand.Float64()*30 + 40,
			"memory":            rand.Float64()*20 + 60,
			"disk":              rand.Float64()*15 + 35,
			"network":           rand.Float64()*40 + 30,
			"activeConnections": rand.Intn(1000) + 500,
			"requestsPerSecond": rand.Intn(50) + 20,
			"errorRate":         rand.Float64()*2 + 0.1,
			"uptime":            99.8 + rand.Float64()*0.2,
		}
		b, _ := json.Marshal(metrics)
		w.Write([]byte("data: "))
		w.Write(b)
		w.Write([]byte("\n\n"))
		flusher.Flush()
		time.Sleep(1 * time.Second)
		if r.Context().Err() != nil {
			return
		}
	}
}
