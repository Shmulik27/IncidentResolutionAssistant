package tests

import (
	"backend/go-backend/handlers"
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func mockFullPipelineRunLogScanJob(userID string, job models.Job) ([]models.Incident, error) {
	return []models.Incident{{
		ID:        "inc-pipeline-" + job.ID,
		UserID:    userID,
		JobID:     job.ID,
		Timestamp: time.Now(),
		LogLine:   "ERROR pipeline test log",
		Analysis:  "{\"result\":\"fail\"}",
		RootCause: "{\"root\":\"bad config\"}",
		Knowledge: "{\"kb\":\"restart\"}",
		Action:    "{\"action\":\"restart pod\"}",
	}}, nil
}

func TestFullLogScanPipelineIntegration(t *testing.T) {
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
		Interval:  1 * time.Second,
		CreatedAt: time.Now(),
	}
	_ = utils.AddJob(userID, job)

	// Patch RunLogScanJob
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = mockFullPipelineRunLogScanJob
	defer func() { utils.RunLogScanJob = orig }()

	go utils.StartScheduler()
	time.Sleep(1500 * time.Millisecond)
	utils.StopScheduler()

	// Check that incident is created and retrievable via API
	r := httptest.NewRequest("GET", "/api/incidents/recent", nil)
	r = withUser(r, userID)
	w := httptest.NewRecorder()
	handlers.HandleGetRecentIncidents(w, r)
	if w.Code != 200 {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var incidents []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &incidents)
	if len(incidents) == 0 || incidents[0]["log_line"] != "ERROR pipeline test log" {
		t.Fatalf("Pipeline incident not found or incorrect: %+v", incidents)
	}
}
