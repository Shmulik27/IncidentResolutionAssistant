package handlers

import (
	"backend/go-backend/logger"
	"net/http"
)

func HandleHealth(w http.ResponseWriter, r *http.Request) {
	logger.Logger.Info("[Health] Health check endpoint hit from ", r.RemoteAddr)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(`{"status": "ok"}`)); err != nil {
		logger.Logger.Error("[Health] Failed to write response: ", err)
	}
}
