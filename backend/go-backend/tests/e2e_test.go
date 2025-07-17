package tests

import (
	"backend/go-backend/handlers"
	"backend/go-backend/models"
	testhelpers "backend/go-backend/testhelpers"
	"backend/go-backend/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

// Start a mock HTTP service that always returns a fixed JSON response
func startMockService(t *testing.T, response map[string]interface{}) (string, func()) {
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("Failed to start mock service: %v", err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})
	srv := &http.Server{Handler: mux}
	go srv.Serve(ln)
	return fmt.Sprintf("http://%s", ln.Addr().String()), func() { srv.Close(); ln.Close() }
}

func TestE2E_LogScanJobToIncident(t *testing.T) {
	// Start mock services
	analyzerURL, stopAnalyzer := startMockService(t, map[string]interface{}{"result": "analyzed"})
	predictorURL, stopPredictor := startMockService(t, map[string]interface{}{"root_cause": "bad config"})
	kbURL, stopKB := startMockService(t, map[string]interface{}{"kb": "restart"})
	recURL, stopRec := startMockService(t, map[string]interface{}{"action": "restart pod"})
	defer stopAnalyzer()
	defer stopPredictor()
	defer stopKB()
	defer stopRec()

	os.Setenv("LOG_ANALYZER_URL", analyzerURL)
	os.Setenv("ROOT_CAUSE_PREDICTOR_URL", predictorURL)
	os.Setenv("KNOWLEDGE_BASE_URL", kbURL)
	os.Setenv("ACTION_RECOMMENDER_URL", recURL)

	// Use temp files for jobs/incidents
	utils.JobsFile = "test_jobs_data_e2e.json"
	utils.IncidentsFile = "test_incidents_data_e2e.json"
	defer os.Remove(utils.JobsFile)
	defer os.Remove(utils.IncidentsFile)

	jobService := &handlers.DefaultJobService{}

	// Patch RunLogScanJob to always return a test incident
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = func(userID string, job models.Job) ([]models.Incident, error) {
		return []models.Incident{{
			ID:        "inc-e2e-" + job.ID,
			UserID:    userID,
			JobID:     job.ID,
			Timestamp: time.Now(),
			LogLine:   "ERROR e2e test log",
			Analysis:  "{\"result\":\"e2e\"}",
			RootCause: "{\"root\":\"e2e\"}",
			Knowledge: "{\"kb\":\"e2e\"}",
			Action:    "{\"action\":\"e2e\"}",
		}}, nil
	}
	defer func() { utils.RunLogScanJob = orig }()

	// Start backend server
	mux := http.NewServeMux()
	mux.HandleFunc("/api/log-scan-jobs", handlers.HandleCreateLogScanJob(jobService))
	mux.HandleFunc("/api/incidents/recent", handlers.HandleGetRecentIncidents(jobService))
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("Failed to start backend: %v", err)
	}
	go http.Serve(ln, mux)

	// Create a job via API
	jobReq := map[string]interface{}{
		"name":       "E2E Job",
		"namespace":  "default",
		"log_levels": []string{"ERROR"},
		"interval":   1,
	}
	body, _ := json.Marshal(jobReq)
	// Use httptest to inject user context
	r := httptest.NewRequest("POST", "/api/log-scan-jobs", bytes.NewReader(body))
	r = testhelpers.WithUser(r, "e2euser")
	w := httptest.NewRecorder()
	handlers.HandleCreateLogScanJob(jobService)(w, r)
	if w.Code != 201 {
		t.Fatalf("Create job failed: %d %s", w.Code, w.Body.String())
	}

	// Start scheduler
	go utils.StartScheduler()
	defer func() { recover(); utils.StopScheduler() }()

	// Wait for the job to run
	time.Sleep(1500 * time.Millisecond)

	// Fetch incidents via API
	r = httptest.NewRequest("GET", "/api/incidents/recent", nil)
	r = testhelpers.WithUser(r, "e2euser")
	w = httptest.NewRecorder()
	handlers.HandleGetRecentIncidents(jobService)(w, r)
	if w.Code != 200 {
		t.Fatalf("Get incidents failed: %d %s", w.Code, w.Body.String())
	}
	var incidents []map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &incidents)
	if len(incidents) == 0 {
		t.Fatalf("Expected at least one incident, got none")
	}
	log.Printf("E2E incident: %+v", incidents[0])
}
