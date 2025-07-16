package utils

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"sync"

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
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	file, err := os.Open(JobsFile)
	if err != nil {
		if os.IsNotExist(err) {
			jobs = make(map[string][]models.Job)
			return nil
		}
		return err
	}
	defer file.Close()
	return json.NewDecoder(file).Decode(&jobs)
}

// SaveJobs saves jobs from memory to the JSON file
func SaveJobs() error {
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()
	data, err := json.MarshalIndent(jobs, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(JobsFile, data, 0644)
}

// LoadIncidents loads incidents from the JSON file into memory
func LoadIncidents() error {
	incidentsMutex.Lock()
	defer incidentsMutex.Unlock()
	file, err := os.Open(IncidentsFile)
	if err != nil {
		if os.IsNotExist(err) {
			incidents = make(map[string][]models.Incident)
			return nil
		}
		return err
	}
	defer file.Close()
	return json.NewDecoder(file).Decode(&incidents)
}

// SaveIncidents saves incidents from memory to the JSON file
func SaveIncidents() error {
	incidentsMutex.RLock()
	defer incidentsMutex.RUnlock()
	data, err := json.MarshalIndent(incidents, "", "  ")
	if err != nil {
		return err
	}
	return ioutil.WriteFile(IncidentsFile, data, 0644)
}

// AddJob adds a job for a user and persists it asynchronously
func AddJob(userID string, job models.Job) error {
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
	incidentsMutex.Lock()
	defer incidentsMutex.Unlock()
	incidents[userID] = append(incidents[userID], incident)
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
