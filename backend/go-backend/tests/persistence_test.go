package tests

import (
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"os"
	"testing"
	"time"
)

func TestJobPersistence(t *testing.T) {
	// Use a temp file for jobs
	jobsFile := "test_jobs_data.json"
	utils.JobsFile = jobsFile
	defer os.Remove(jobsFile)

	userID := "user1"
	job := models.Job{
		ID:        "job1",
		UserID:    userID,
		Name:      "Test Job",
		Namespace: "default",
		LogLevels: []string{"ERROR"},
		Interval:  60,
		CreatedAt: time.Now(),
	}

	err := utils.AddJob(userID, job)
	if err != nil {
		t.Fatalf("AddJob failed: %v", err)
	}
	jobs := utils.GetJobs(userID)
	if len(jobs) != 1 || jobs[0].ID != "job1" {
		t.Fatalf("GetJobs failed: got %+v", jobs)
	}

	err = utils.SaveJobs()
	if err != nil {
		t.Fatalf("SaveJobs failed: %v", err)
	}
	utils.JobsFile = jobsFile // reload from temp file
	err = utils.LoadJobs()
	if err != nil {
		t.Fatalf("LoadJobs failed: %v", err)
	}
	jobs = utils.GetJobs(userID)
	if len(jobs) != 1 || jobs[0].ID != "job1" {
		t.Fatalf("GetJobs after reload failed: got %+v", jobs)
	}

	err = utils.DeleteJob(userID, "job1")
	if err != nil {
		t.Fatalf("DeleteJob failed: %v", err)
	}
	jobs = utils.GetJobs(userID)
	if len(jobs) != 0 {
		t.Fatalf("DeleteJob did not remove job: %+v", jobs)
	}
}

func TestIncidentPersistence(t *testing.T) {
	// Use a temp file for incidents
	incidentsFile := "test_incidents_data.json"
	utils.IncidentsFile = incidentsFile
	defer os.Remove(incidentsFile)

	userID := "user1"
	incident := models.Incident{
		ID:        "inc1",
		UserID:    userID,
		JobID:     "job1",
		Timestamp: time.Now(),
		LogLine:   "ERROR something failed",
		Analysis:  "{\"result\":\"fail\"}",
	}
	err := utils.AddIncident(userID, incident)
	if err != nil {
		t.Fatalf("AddIncident failed: %v", err)
	}
	incidents := utils.GetRecentIncidents(userID)
	if len(incidents) != 1 || incidents[0].ID != "inc1" {
		t.Fatalf("GetRecentIncidents failed: got %+v", incidents)
	}

	err = utils.SaveIncidents()
	if err != nil {
		t.Fatalf("SaveIncidents failed: %v", err)
	}
	utils.IncidentsFile = incidentsFile // reload from temp file
	err = utils.LoadIncidents()
	if err != nil {
		t.Fatalf("LoadIncidents failed: %v", err)
	}
	incidents = utils.GetRecentIncidents(userID)
	if len(incidents) != 1 || incidents[0].ID != "inc1" {
		t.Fatalf("GetRecentIncidents after reload failed: got %+v", incidents)
	}
}
