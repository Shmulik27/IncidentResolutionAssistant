package tests

import (
	"backend/go-backend/handlers"
	"backend/go-backend/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
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

	// Start backend server
	mux := http.NewServeMux()
	mux.HandleFunc("/api/log-scan-jobs", handlers.HandleCreateLogScanJob)
	mux.HandleFunc("/api/incidents/recent", handlers.HandleGetRecentIncidents)
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatalf("Failed to start backend: %v", err)
	}
	go http.Serve(ln, mux)
	baseURL := fmt.Sprintf("http://%s", ln.Addr().String())

	// Create a job via API
	jobReq := map[string]interface{}{
		"name":       "E2E Job",
		"namespace":  "default",
		"log_levels": []string{"ERROR"},
		"interval":   1,
	}
	body, _ := json.Marshal(jobReq)
	resp, err := http.Post(baseURL+"/api/log-scan-jobs", "application/json", bytes.NewReader(body))
	if err != nil {
		t.Fatalf("Failed to create job: %v", err)
	}
	if resp.StatusCode != 201 {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("Create job failed: %d %s", resp.StatusCode, string(b))
	}
	resp.Body.Close()

	// Start scheduler
	go utils.StartScheduler()
	defer utils.StopScheduler()

	// Wait for the job to run
	time.Sleep(1500 * time.Millisecond)

	// Fetch incidents via API
	resp, err = http.Get(baseURL + "/api/incidents/recent")
	if err != nil {
		t.Fatalf("Failed to get incidents: %v", err)
	}
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("Get incidents failed: %d %s", resp.StatusCode, string(b))
	}
	var incidents []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&incidents)
	if len(incidents) == 0 {
		t.Fatalf("Expected at least one incident, got none")
	}
	log.Printf("E2E incident: %+v", incidents[0])
}
