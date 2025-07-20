package main

import (
	"backend/go-backend/models"
	"encoding/json"
	"io"
	"log"
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
		if _, err := io.WriteString(w, `{"anomalies": ["error line"], "count": 1, "details": {"keyword": ["error line"], "frequency": [], "entity": []}}`); err != nil {
			log.Printf("failed to write string: %v", err)
		}
	}))
	defer mockAnalyzer.Close()

	// Patch the URL in the handler (simulate env var or config)
	oldURL := os.Getenv("LOG_ANALYZER_URL")
	if err := os.Setenv("LOG_ANALYZER_URL", mockAnalyzer.URL); err != nil {
		t.Fatalf("failed to set LOG_ANALYZER_URL: %v", err)
	}
	defer func() {
		if err := os.Setenv("LOG_ANALYZER_URL", oldURL); err != nil {
			t.Errorf("failed to reset LOG_ANALYZER_URL: %v", err)
		}
	}()

	// Start Go server with patched handler
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req models.LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		body, _ := json.Marshal(req)
		resp, err := http.Post(os.Getenv("LOG_ANALYZER_URL"), "application/json", strings.NewReader(string(body)))
		if err != nil {
			http.Error(w, "Failed to contact log analyzer", http.StatusInternalServerError)
			return
		}
		defer func() {
			if err := resp.Body.Close(); err != nil {
				t.Errorf("failed to close response body: %v", err)
			}
		}()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			t.Fatalf("failed to copy response body: %v", err)
		}
	})

	ts := httptest.NewServer(h)
	defer ts.Close()

	// Send test request
	payload := `{"logs": ["error line", "ok line"]}`
	resp, err := http.Post(ts.URL, "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("failed to close response body: %v", err)
		}
	}()
	if resp.StatusCode != 200 {
		t.Fatalf("Expected 200, got %d", resp.StatusCode)
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if result["count"].(float64) != 1 {
		t.Errorf("Expected count 1, got %v", result["count"])
	}
}

func TestAnalyzeEndpoint_PythonServiceDown(t *testing.T) {
	if err := os.Setenv("LOG_ANALYZER_URL", "http://localhost:9999/doesnotexist"); err != nil {
		t.Fatalf("failed to set LOG_ANALYZER_URL: %v", err)
	}
	defer func() {
		if err := os.Unsetenv("LOG_ANALYZER_URL"); err != nil {
			t.Errorf("failed to unset LOG_ANALYZER_URL: %v", err)
		}
	}()

	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req models.LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		body, _ := json.Marshal(req)
		resp, err := http.Post(os.Getenv("LOG_ANALYZER_URL"), "application/json", strings.NewReader(string(body)))
		if err != nil {
			http.Error(w, "Failed to contact log analyzer", http.StatusInternalServerError)
			return
		}
		defer func() {
			if err := resp.Body.Close(); err != nil {
				t.Errorf("failed to close response body: %v", err)
			}
		}()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			t.Fatalf("failed to copy response body: %v", err)
		}
	})

	ts := httptest.NewServer(h)
	defer ts.Close()

	payload := `{"logs": ["error line"]}`
	resp, err := http.Post(ts.URL, "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("failed to close response body: %v", err)
		}
	}()
	if resp.StatusCode != 500 {
		t.Fatalf("Expected 500, got %d", resp.StatusCode)
	}
}

func TestAnalyzeEndpoint_InvalidInput(t *testing.T) {
	// Valid handler, but send malformed JSON
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req models.LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
	})

	ts := httptest.NewServer(h)
	defer ts.Close()

	// Malformed JSON
	resp, err := http.Post(ts.URL, "application/json", strings.NewReader("notjson"))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("failed to close response body: %v", err)
		}
	}()
	if resp.StatusCode != 400 {
		t.Fatalf("Expected 400, got %d", resp.StatusCode)
	}

	// Missing 'logs' field
	resp, err = http.Post(ts.URL, "application/json", strings.NewReader(`{"notlogs": ["A"]}`))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("failed to close response body: %v", err)
		}
	}()
	if resp.StatusCode != 400 {
		t.Fatalf("Expected 400, got %d", resp.StatusCode)
	}
}

func TestPredictEndpoint(t *testing.T) {
	// Mock Python root cause predictor service
	mockPredictor := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if _, err := io.WriteString(w, `{"root_cause": "Memory exhaustion"}`); err != nil {
			log.Printf("failed to write string: %v", err)
		}
	}))
	defer mockPredictor.Close()

	// Patch the URL in the handler (simulate env var or config)
	oldURL := os.Getenv("ROOT_CAUSE_PREDICTOR_URL")
	if err := os.Setenv("ROOT_CAUSE_PREDICTOR_URL", mockPredictor.URL); err != nil {
		t.Fatalf("failed to set ROOT_CAUSE_PREDICTOR_URL: %v", err)
	}
	defer func() {
		if err := os.Setenv("ROOT_CAUSE_PREDICTOR_URL", oldURL); err != nil {
			t.Errorf("failed to reset ROOT_CAUSE_PREDICTOR_URL: %v", err)
		}
	}()

	// Start Go server with patched handler
	h := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req models.LogRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		if req.Logs == nil {
			http.Error(w, "Missing 'logs' field", http.StatusBadRequest)
			return
		}
		body, _ := json.Marshal(req)
		resp, err := http.Post(os.Getenv("ROOT_CAUSE_PREDICTOR_URL"), "application/json", strings.NewReader(string(body)))
		if err != nil {
			http.Error(w, "Failed to contact root cause predictor", http.StatusInternalServerError)
			return
		}
		defer func() {
			if err := resp.Body.Close(); err != nil {
				t.Errorf("failed to close response body: %v", err)
			}
		}()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			t.Fatalf("failed to copy response body: %v", err)
		}
	})

	ts := httptest.NewServer(h)
	defer ts.Close()

	// Send test request
	payload := `{"logs": ["Out of memory error"]}`
	resp, err := http.Post(ts.URL, "application/json", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("Failed to POST: %v", err)
	}
	defer func() {
		if err := resp.Body.Close(); err != nil {
			t.Errorf("failed to close response body: %v", err)
		}
	}()
	if resp.StatusCode != 200 {
		t.Fatalf("Expected 200, got %d", resp.StatusCode)
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if result["root_cause"].(string) != "Memory exhaustion" {
		t.Errorf("Expected root_cause 'Memory exhaustion', got %v", result["root_cause"])
	}
}
