package tests

import (
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"os"
	"testing"
	"time"
)

// func mockFullPipelineRunLogScanJob(userID string, job models.Job) ([]models.Incident, error) {
// 	return []models.Incident{{
// 		ID:        "inc-pipeline-" + job.ID,
// 		UserID:    userID,
// 		JobID:     job.ID,
// 		Timestamp: time.Now(),
// 		LogLine:   "ERROR pipeline test log",
// 		Analysis:  "{\"result\":\"fail\"}",
// 		RootCause: "{\"root\":\"bad config\"}",
// 		Knowledge: "{\"kb\":\"restart\"}",
// 		Action:    "{\"action\":\"restart pod\"}",
// 	}}, nil
// }

func TestFullLogScanPipelineIntegration(t *testing.T) {
	utils.ResetSchedulerForTest()
	utils.ClearJobs()
	utils.ClearIncidents()
	defer func() { recover(); utils.StopScheduler() }()
	utils.JobsFile = "test_jobs_data_pipeline.json"
	utils.IncidentsFile = "test_incidents_data_pipeline.json"
	defer os.Remove(utils.JobsFile)
	defer os.Remove(utils.IncidentsFile)

	userID := "pipelineuser"
	job := models.Job{
		ID:        "job-pipeline",
		UserID:    userID,
		Name:      "Pipeline Job",
		Namespace: "default",
		LogLevels: []string{"ERROR"},
		Interval:  1,
		CreatedAt: time.Now(),
		LastRun:   time.Now().Add(-time.Hour),
	}
	_ = utils.AddJob(userID, job)

	// Patch RunLogScanJob to always return a test incident
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = func(userID string, job models.Job) ([]models.Incident, error) {
		return []models.Incident{{ID: "test-incident", JobID: job.ID, UserID: userID, LogLine: "ERROR test log"}}, nil
	}
	defer func() { utils.RunLogScanJob = orig }()

	go utils.StartScheduler()
	time.Sleep(100 * time.Millisecond) // Give the scheduler goroutine time to start

	// Poll for up to 5 seconds for the incident to appear
	found := false
	for i := 0; i < 50; i++ {
		incidents := utils.GetRecentIncidents(userID)
		if len(incidents) > 0 {
			found = true
			break
		}
		utils.Logger.Info("[Test] No incidents yet, sleeping...")
		time.Sleep(100 * time.Millisecond)
	}
	utils.StopScheduler()
	if !found {
		t.Fatalf("Pipeline incident not found or incorrect: %v", utils.GetRecentIncidents(userID))
	}
}
