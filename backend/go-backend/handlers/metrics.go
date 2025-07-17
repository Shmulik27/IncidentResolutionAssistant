package handlers

import (
	"backend/go-backend/logger"
	"encoding/json"
	"math/rand"
	"net/http"
	"time"
)

func MetricsStreamHandler(w http.ResponseWriter, r *http.Request) {
	logger.Logger.Info("[Metrics] Metrics stream started from", r.RemoteAddr)
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
		if _, err := w.Write([]byte("data: ")); err != nil {
			logger.Logger.Error("[Metrics] Failed to write SSE data (data:):", err)
		}
		if _, err := w.Write(b); err != nil {
			logger.Logger.Error("[Metrics] Failed to write SSE data (metrics):", err)
		}
		if _, err := w.Write([]byte("\n\n")); err != nil {
			logger.Logger.Error("[Metrics] Failed to write SSE data (newline):", err)
		}
		flusher.Flush()
		time.Sleep(1 * time.Second)
		if r.Context().Err() != nil {
			logger.Logger.Info("[Metrics] Metrics stream closed for", r.RemoteAddr)
			return
		}
	}
}
