package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"backend/go-backend/logger"
	"backend/go-backend/models"
	"backend/go-backend/utils"

	"time"

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
func HandleCreateLogScanJob(jobService JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] CreateLogScanJob called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		var req CreateJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[Jobs] Invalid create job request:", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		job, err := jobService.CreateLogScanJob(userID, req)
		if err != nil {
			if err == ErrInvalidJobRequest {
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
func HandleListLogScanJobs(jobService JobService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Jobs] ListLogScanJobs called from", r.RemoteAddr)
		userID, ok := getUserID(r)
		if !ok {
			logger.Logger.Warn("[Jobs] Unauthorized request")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		jobs, err := jobService.ListLogScanJobs(userID)
		if err != nil {
			logger.Logger.Error("[Jobs] Failed to list jobs:", err)
			http.Error(w, "Failed to list jobs", http.StatusInternalServerError)
			return
		}
		logger.Logger.Info("[Jobs] Returning", len(jobs), "jobs for user", userID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(jobs)
	}
}

// DELETE /api/log-scan-jobs/{id}
func HandleDeleteLogScanJob(jobService JobService) http.HandlerFunc {
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
			if err == ErrJobNotFound {
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
func HandleUpdateLogScanJob(jobService JobService) http.HandlerFunc {
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
		var req UpdateJobRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[Jobs] Invalid update job request:", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		jobs, err := jobService.UpdateLogScanJob(userID, jobID, req)
		if err != nil {
			if err == ErrInvalidJobRequest {
				http.Error(w, "Missing namespace or invalid interval", http.StatusBadRequest)
				return
			}
			if err == ErrJobNotFound {
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
		json.NewEncoder(w).Encode(jobs)
	}
}

// GET /api/incidents/recent
func HandleGetRecentIncidents(jobService JobService) http.HandlerFunc {
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

// JobService abstracts job and incident operations for handlers
type JobService interface {
	CreateLogScanJob(userID string, req CreateJobRequest) (models.Job, error)
	ListLogScanJobs(userID string) ([]models.Job, error)
	UpdateLogScanJob(userID, jobID string, req UpdateJobRequest) ([]models.Job, error)
	DeleteLogScanJob(userID, jobID string) error
	GetRecentIncidents(userID string) ([]models.Incident, error)
}

// DefaultJobService implements JobService using utils and models
// (for backward compatibility; refactor internals as needed)
type DefaultJobService struct{}

// Request structs for clarity
// (reuse these in handler decoding)
type CreateJobRequest struct {
	Name          string   `json:"name"`
	Namespace     string   `json:"namespace"`
	LogLevels     []string `json:"log_levels"`
	Interval      int      `json:"interval"`
	Pods          []string `json:"pods"`
	Cluster       string   `json:"cluster"`
	Microservices []string `json:"microservices"`
}

type UpdateJobRequest struct {
	Name          string   `json:"name"`
	Namespace     string   `json:"namespace"`
	LogLevels     []string `json:"log_levels"`
	Interval      int      `json:"interval"`
	Microservices []string `json:"microservices"`
	Pods          []string `json:"pods"`
	Cluster       string   `json:"cluster"`
}

// Error definitions
var ErrInvalidJobRequest = errors.New("invalid job request")
var ErrJobNotFound = errors.New("job not found")

// ListLogScanJobs returns all log scan jobs for a user
func (s *DefaultJobService) ListLogScanJobs(userID string) ([]models.Job, error) {
	jobs := utils.GetJobs(userID)
	if jobs == nil {
		jobs = []models.Job{}
	}
	return jobs, nil
}

// UpdateLogScanJob updates a log scan job for a user
func (s *DefaultJobService) UpdateLogScanJob(userID, jobID string, req UpdateJobRequest) ([]models.Job, error) {
	if req.Namespace == "" || req.Interval <= 0 {
		return nil, ErrInvalidJobRequest
	}
	jobs := utils.GetJobs(userID)
	updated := false
	for i, job := range jobs {
		if job.ID == jobID {
			jobs[i].Name = req.Name
			jobs[i].Namespace = req.Namespace
			jobs[i].LogLevels = req.LogLevels
			jobs[i].Interval = req.Interval
			jobs[i].Microservices = req.Microservices
			jobs[i].Pods = req.Pods
			jobs[i].Cluster = req.Cluster
			updated = true
			break
		}
	}
	if !updated {
		return nil, ErrJobNotFound
	}
	utils.SetJobs(userID, jobs)
	go utils.SaveJobs()
	return jobs, nil
}

// DeleteLogScanJob deletes a log scan job for a user
func (s *DefaultJobService) DeleteLogScanJob(userID, jobID string) error {
	if err := utils.DeleteJob(userID, jobID); err != nil {
		if err.Error() == "job not found" {
			return ErrJobNotFound
		}
		return err
	}
	return nil
}

// GetRecentIncidents returns recent incidents for a user
func (s *DefaultJobService) GetRecentIncidents(userID string) ([]models.Incident, error) {
	incidents := utils.GetRecentIncidents(userID)
	return incidents, nil
}

// CreateLogScanJob creates a new log scan job for a user
func (s *DefaultJobService) CreateLogScanJob(userID string, req CreateJobRequest) (models.Job, error) {
	if req.Namespace == "" || req.Interval <= 0 {
		return models.Job{}, ErrInvalidJobRequest
	}
	if req.Microservices == nil || len(req.Microservices) == 0 {
		req.Microservices = []string{
			"log_analyzer",
			"root_cause_predictor",
			"knowledge_base",
			"action_recommender",
		}
	}
	job := models.Job{
		ID:            uuid.New().String(),
		UserID:        userID,
		Name:          req.Name,
		Cluster:       req.Cluster,
		Namespace:     req.Namespace,
		LogLevels:     req.LogLevels,
		Interval:      req.Interval,
		Pods:          req.Pods,
		CreatedAt:     time.Now(),
		LastRun:       time.Now().Add(-time.Duration(req.Interval) * time.Second),
		Microservices: req.Microservices,
	}
	if err := utils.AddJob(userID, job); err != nil {
		return models.Job{}, err
	}
	return job, nil
}
