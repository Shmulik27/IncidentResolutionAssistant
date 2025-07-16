package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"backend/go-backend/models"
	"backend/go-backend/utils"

	"firebase.google.com/go/v4/auth"
	"github.com/google/uuid"
)

func getUserID(r *http.Request) (string, bool) {
	token, ok := r.Context().Value("user").(*auth.Token)
	if !ok || token == nil {
		return "", false
	}
	return token.UID, true
}

// POST /api/log-scan-jobs
func HandleCreateLogScanJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	var req struct {
		Name      string   `json:"name"`
		Namespace string   `json:"namespace"`
		LogLevels []string `json:"log_levels"`
		Interval  int      `json:"interval"` // seconds
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if req.Namespace == "" || req.Interval <= 0 {
		http.Error(w, "Missing namespace or invalid interval", http.StatusBadRequest)
		return
	}
	job := models.Job{
		ID:        uuid.New().String(),
		UserID:    userID,
		Name:      req.Name,
		Namespace: req.Namespace,
		LogLevels: req.LogLevels,
		Interval:  time.Duration(req.Interval) * time.Second,
		CreatedAt: time.Now(),
		LastRun:   time.Time{},
	}
	if err := utils.AddJob(userID, job); err != nil {
		http.Error(w, "Failed to add job", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(job)
}

// GET /api/log-scan-jobs
func HandleListLogScanJobs(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	jobs := utils.GetJobs(userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(jobs)
}

// DELETE /api/log-scan-jobs/{id}
func HandleDeleteLogScanJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 4 {
		http.Error(w, "Missing job ID", http.StatusBadRequest)
		return
	}
	jobID := parts[3]
	if err := utils.DeleteJob(userID, jobID); err != nil {
		http.Error(w, "Failed to delete job", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/incidents/recent
func HandleGetRecentIncidents(w http.ResponseWriter, r *http.Request) {
	userID, ok := getUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	incidents := utils.GetRecentIncidents(userID)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(incidents)
}
