package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestAnalyzeEndpoint(t *testing.T) {
	// Mock Python log analyzer service
	mockAnalyzer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"anomalies": ["error line"], "count": 1, "details": {"keyword": ["error line"], "frequency": [], "entity": []}}`)
	}))
	defer mockAnalyzer.Close()

	// Patch the URL in the handler (simulate env var or config)
	oldURL := os.Getenv("LOG_ANALYZER_URL")
	os.Setenv("LOG_ANALYZER_URL", mockAnalyzer.URL)
	defer os.Setenv("LOG_ANALYZER_URL", oldURL)

	// Start Go server with patched handler
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		body, _ := json.Marshal(req)
		resp, err := http.Post(os.Getenv("LOG_ANALYZER_URL"), "application/json", strings.NewReader(string(body)))
		if err != nil {
			http.Error(w, "Failed to contact log analyzer", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	})

	ts := httptest.NewServer(h)
	defer ts.Close()

	// Send test request
	payload := `{"logs": ["error line", "ok line"]}`
	resp, err := http.Post(ts.URL, "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("Expected 200, got %d", resp.StatusCode)
	}
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	if result["count"].(float64) != 1 {
		t.Errorf("Expected count 1, got %v", result["count"])
	}
}
