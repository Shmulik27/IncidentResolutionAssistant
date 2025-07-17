package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"backend/go-backend/logger"
	"backend/go-backend/services"

	"firebase.google.com/go/v4/auth"
)

func getUserID(r *http.Request) (string, bool) {
	token, ok := r.Context().Value("user").(*auth.Token)
	if !ok || token == nil {
		return "", false
	}
	return token.UID, true
}

// POST /api/log-scan-jobs
func HandleCreateLogScanJob(jobService services.JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] CreateLogScanJob called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		var req services.CreateJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[Jobs] Invalid create job request:", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		job, err := jobService.CreateLogScanJob(userID, req)
		if err != nil {
			if err == services.ErrInvalidJobRequest {
				http.Error(w, "Missing namespace or invalid interval", http.StatusBadRequest)
				return
			}
			logger.Logger.Error("[Jobs] Failed to add job:", err)
			http.Error(w, "Failed to add job", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Jobs] Job created for user", userID, ":", job)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(job)
	}
}

// GET /api/log-scan-jobs
func HandleListLogScanJobs(jobService services.JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] ListLogScanJobs called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		jobList, err := jobService.ListLogScanJobs(userID)
		if err != nil {
			logger.Logger.Error("[Jobs] Failed to list jobs:", err)
			http.Error(w, "Failed to list jobs", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Jobs] Returning", len(jobList), "jobs for user", userID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(jobList)
	}
}

// DELETE /api/log-scan-jobs/{id}
func HandleDeleteLogScanJob(jobService services.JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] DeleteLogScanJob called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			http.Error(w, "Missing job ID", http.StatusBadRequest)
			return
		}
		jobID := parts[3]
		err := jobService.DeleteLogScanJob(userID, jobID)
		if err != nil {
			if err == services.ErrJobNotFound {
				logger.Logger.Warn("[Jobs] Job not found for delete: jobID=", jobID)
				http.Error(w, "Job not found", http.StatusNotFound)
				return
			}
			logger.Logger.Error("[Jobs] Failed to delete job:", err)
			http.Error(w, "Failed to delete job", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Jobs] Job deleted for user", userID, "jobID:", jobID)
		w.WriteHeader(http.StatusNoContent)
	}
}

// PUT /api/log-scan-jobs/{id}
func HandleUpdateLogScanJob(jobService services.JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] UpdateLogScanJob called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			http.Error(w, "Missing job ID", http.StatusBadRequest)
			return
		}
		jobID := parts[3]
		var req services.UpdateJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[Jobs] Invalid update job request:", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		jobList, err := jobService.UpdateLogScanJob(userID, jobID, req)
		if err != nil {
			if err == services.ErrInvalidJobRequest {
				http.Error(w, "Missing namespace or invalid interval", http.StatusBadRequest)
				return
			}
			if err == services.ErrJobNotFound {
				logger.Logger.Warn("[Jobs] Job not found for update: jobID=", jobID)
				http.Error(w, "Job not found", http.StatusNotFound)
				return
			}
			logger.Logger.Error("[Jobs] Failed to update job:", err)
			http.Error(w, "Failed to update job", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Jobs] Job updated for user", userID, "jobID:", jobID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(jobList)
	}
}

// GET /api/incidents/recent
func HandleGetRecentIncidents(jobService services.JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Incidents] GetRecentIncidents called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Incidents] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		incidents, err := jobService.GetRecentIncidents(userID)
		if err != nil {
			logger.Logger.Error("[Incidents] Failed to get recent incidents:", err)
			http.Error(w, "Failed to get recent incidents", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Incidents] Returning", len(incidents), "incidents for user", userID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(incidents)
	}
}
