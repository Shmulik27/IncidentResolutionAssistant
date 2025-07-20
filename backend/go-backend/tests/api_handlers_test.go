package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"backend/go-backend/handlers"
	"backend/go-backend/services"
	testhelpers "backend/go-backend/testhelpers"
	"backend/go-backend/utils"
)

func TestJobAPIHandlers(t *testing.T) {
	userID := "testuser"
	utils.JobsFile = "test_jobs_data.json"
	defer func() {
		if err := os.Remove(utils.JobsFile); err != nil && !os.IsNotExist(err) {
			t.Errorf("failed to remove jobs file: %v", err)
		}
	}()
	utils.IncidentsFile = "test_incidents_data.json"
	defer func() {
		if err := os.Remove(utils.IncidentsFile); err != nil && !os.IsNotExist(err) {
			t.Errorf("failed to remove incidents file: %v", err)
		}
	}()

	jobService := &services.DefaultJobService{}

	// Test create job
	jobReq := map[string]interface{}{
		"name":       "Test Job",
		"namespace":  "default",
		"log_levels": []string{"ERROR"},
		"interval":   60,
	}
	body, _ := json.Marshal(jobReq)
	r := httptest.NewRequest("POST", "/api/log-scan-jobs", bytes.NewReader(body))
	r = testhelpers.WithUser(r, userID)
	w := httptest.NewRecorder()
	handlers.HandleCreateLogScanJob(jobService)(w, r)
	if w.Code != http.StatusCreated {
		t.Fatalf("Create job failed: %d %s", w.Code, w.Body.String())
	}
	var jobResp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &jobResp); err != nil {
		t.Fatalf("failed to unmarshal job response: %v", err)
	}
	if jobResp["name"] != "Test Job" {
		t.Fatalf("Job name mismatch: %+v", jobResp)
	}

	// Test list jobs
	r = httptest.NewRequest("GET", "/api/log-scan-jobs", nil)
	r = testhelpers.WithUser(r, userID)
	w = httptest.NewRecorder()
	handlers.HandleListLogScanJobs(jobService)(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("List jobs failed: %d %s", w.Code, w.Body.String())
	}
	var jobs []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &jobs); err != nil {
		t.Fatalf("failed to unmarshal jobs: %v", err)
	}
	if len(jobs) != 1 || jobs[0]["name"] != "Test Job" {
		t.Fatalf("List jobs mismatch: %+v", jobs)
	}

	// Test delete job
	jobID := jobs[0]["id"].(string)
	r = httptest.NewRequest("DELETE", "/api/log-scan-jobs/"+jobID, nil)
	r = testhelpers.WithUser(r, userID)
	w = httptest.NewRecorder()
	handlers.HandleDeleteLogScanJob(jobService)(w, r)
	if w.Code != http.StatusNoContent {
		t.Fatalf("Delete job failed: %d %s", w.Code, w.Body.String())
	}

	// Test get recent incidents (should be empty)
	r = httptest.NewRequest("GET", "/api/incidents/recent", nil)
	r = testhelpers.WithUser(r, userID)
	w = httptest.NewRecorder()
	handlers.HandleGetRecentIncidents(jobService)(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("Get incidents failed: %d %s", w.Code, w.Body.String())
	}
	var incidents []map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &incidents); err != nil {
		t.Fatalf("failed to unmarshal incidents: %v", err)
	}
	if len(incidents) != 0 {
		t.Fatalf("Expected no incidents, got %+v", incidents)
	}
}
