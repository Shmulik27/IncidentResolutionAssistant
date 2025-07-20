package services

import (
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"errors"
	"time"

	"backend/go-backend/logger"

	"github.com/google/uuid"
)

type JobService interface {
	CreateLogScanJob(userID string, req CreateJobRequest) (models.Job, error)
	ListLogScanJobs(userID string) ([]models.Job, error)
	UpdateLogScanJob(userID, jobID string, req UpdateJobRequest) ([]models.Job, error)
	DeleteLogScanJob(userID, jobID string) error
	GetRecentIncidents(userID string) ([]models.Incident, error)
}

type DefaultJobService struct{}

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

var ErrInvalidJobRequest = errors.New("invalid job request")
var ErrJobNotFound = errors.New("job not found")

func (s *DefaultJobService) ListLogScanJobs(userID string) ([]models.Job, error) {
	jobs := utils.GetJobs(userID)
	if jobs == nil {
		jobs = []models.Job{}
	}
	return jobs, nil
}

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
	go func() {
		if err := utils.SaveJobs(); err != nil {
			logger.Logger.Error("Error saving jobs in UpdateLogScanJob goroutine:", err)
		}
	}()
	return jobs, nil
}

func (s *DefaultJobService) DeleteLogScanJob(userID, jobID string) error {
	jobs := utils.GetJobs(userID)
	idx := -1
	for i, job := range jobs {
		if job.ID == jobID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return ErrJobNotFound
	}
	jobs = append(jobs[:idx], jobs[idx+1:]...)
	utils.SetJobs(userID, jobs)
	go func() {
		if err := utils.SaveJobs(); err != nil {
			logger.Logger.Error("Error saving jobs in DeleteLogScanJob goroutine:", err)
		}
	}()
	return nil
}

func (s *DefaultJobService) GetRecentIncidents(userID string) ([]models.Incident, error) {
	incidents := utils.GetRecentIncidents(userID)
	if incidents == nil {
		incidents = []models.Incident{}
	}
	return incidents, nil
}

func (s *DefaultJobService) CreateLogScanJob(userID string, req CreateJobRequest) (models.Job, error) {
	if req.Namespace == "" || req.Interval <= 0 {
		return models.Job{}, ErrInvalidJobRequest
	}
	if len(req.Microservices) == 0 {
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
