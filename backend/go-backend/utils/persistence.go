package utils

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"sync"

	"backend/go-backend/logger"
	"backend/go-backend/models"
)

const MaxConcurrentJobs = 5

var (
	JobsFile       = "jobs_data.json"
	IncidentsFile  = "incidents_data.json"
	jobsMutex      sync.RWMutex
	incidentsMutex sync.RWMutex
	jobs           = make(map[string][]models.Job)      // userID -> jobs
	incidents      = make(map[string][]models.Incident) // userID -> incidents
)

// LoadJobs loads jobs from the JSON file into memory
func LoadJobs() error {
	logger.Logger.Info("Loading jobs from file:", JobsFile)
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	file, err := os.Open(JobsFile)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Logger.Info("Jobs file does not exist, initializing empty jobs map")
			jobs = make(map[string][]models.Job)
			return nil
		}
		logger.Logger.Error("Error opening jobs file:", err)
		return err
	}
	defer file.Close()
	err = json.NewDecoder(file).Decode(&jobs)
	if err != nil {
		logger.Logger.Error("Error decoding jobs file:", err)
	}
	return err
}

// SaveJobs saves jobs from memory to the JSON file
func SaveJobs() error {
	logger.Logger.Info("Saving jobs to file:", JobsFile)
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()
	data, err := json.MarshalIndent(jobs, "", "  ")
	if err != nil {
		logger.Logger.Error("Error marshaling jobs:", err)
		return err
	}
	err = ioutil.WriteFile(JobsFile, data, 0644)
	if err != nil {
		logger.Logger.Error("Error writing jobs file:", err)
	}
	return err
}

// LoadIncidents loads incidents from the JSON file into memory
func LoadIncidents() error {
	logger.Logger.Info("Loading incidents from file:", IncidentsFile)
	incidentsMutex.Lock()
	defer incidentsMutex.Unlock()
	file, err := os.Open(IncidentsFile)
	if err != nil {
		if os.IsNotExist(err) {
			logger.Logger.Info("Incidents file does not exist, initializing empty incidents map")
			incidents = make(map[string][]models.Incident)
			return nil
		}
		logger.Logger.Error("Error opening incidents file:", err)
		return err
	}
	defer file.Close()
	err = json.NewDecoder(file).Decode(&incidents)
	if err != nil {
		logger.Logger.Error("Error decoding incidents file:", err)
	}
	return err
}

// SaveIncidents saves incidents from memory to the JSON file
func SaveIncidents() error {
	logger.Logger.Info("Saving incidents to file:", IncidentsFile)
	incidentsMutex.RLock()
	data, err := json.MarshalIndent(incidents, "", "  ")
	incidentsMutex.RUnlock()
	if err != nil {
		logger.Logger.Error("Error marshaling incidents:", err)
		return err
	}
	err = ioutil.WriteFile(IncidentsFile, data, 0644)
	if err != nil {
		logger.Logger.Error("Error writing incidents file:", err)
	}
	return err
}

// AddJob adds a job for a user and persists it asynchronously
func AddJob(userID string, job models.Job) error {
	logger.Logger.Info("Adding job for user", userID, ":", job)
	jobsMutex.Lock()
	jobs[userID] = append(jobs[userID], job)
	jobsMutex.Unlock()
	go SaveJobs() // Save in background
	return nil
}

// GetJobs returns all jobs for a user
func GetJobs(userID string) []models.Job {
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()
	return jobs[userID]
}

// DeleteJob deletes a job by ID for a user and persists the change asynchronously
func DeleteJob(userID, jobID string) error {
	logger.Logger.Info("Deleting job for user", userID, "jobID:", jobID)
	jobsMutex.Lock()
	userJobs := jobs[userID]
	for i, job := range userJobs {
		if job.ID == jobID {
			jobs[userID] = append(userJobs[:i], userJobs[i+1:]...)
			break
		}
	}
	jobsMutex.Unlock()
	go SaveJobs() // Save in background
	return nil
}

// AddIncident adds an incident for a user and persists it
func AddIncident(userID string, incident models.Incident) error {
	logger.Logger.Info("Adding incident for user", userID, ":", incident)
	incidentsMutex.Lock()
	incidents[userID] = append(incidents[userID], incident)
	incidentsMutex.Unlock()
	return SaveIncidents()
}

// GetRecentIncidents returns recent incidents for a user (last 50)
func GetRecentIncidents(userID string) []models.Incident {
	incidentsMutex.RLock()
	defer incidentsMutex.RUnlock()
	userIncidents := incidents[userID]
	if len(userIncidents) > 50 {
		return userIncidents[len(userIncidents)-50:]
	}
	return userIncidents
}

// SetJobs replaces all jobs for a user (used for editing jobs)
func SetJobs(userID string, newJobs []models.Job) {
	jobsMutex.Lock()
	jobs[userID] = newJobs
	jobsMutex.Unlock()
}
