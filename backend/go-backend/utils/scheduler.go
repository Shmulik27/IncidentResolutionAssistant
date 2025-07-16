package utils

import (
	"log"
	"sync"
	"time"

	"backend/go-backend/models"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	schedulerOnce sync.Once
	stopScheduler chan struct{}
)

// StartScheduler launches the background job scheduler (call once on startup)
func StartScheduler() {
	schedulerOnce.Do(func() {
		stopScheduler = make(chan struct{})
		go runScheduler()
	})
}

func runScheduler() {
	sem := make(chan struct{}, MaxConcurrentJobs)
	for {
		select {
		case <-stopScheduler:
			return
		default:
			// For each user, for each job, check if it's time to run
			jobsMutex.RLock()
			for userID, userJobs := range jobs {
				for i, job := range userJobs {
					if time.Since(job.LastRun) >= time.Duration(job.Interval)*time.Second {
						// Run job in background, limited by semaphore
						sem <- struct{}{}
						go func(userID string, job models.Job, jobIdx int) {
							defer func() { <-sem }()
							// Run the log scan and analysis for this job
							incidents, err := RunLogScanJob(userID, job)
							if err != nil {
								log.Printf("Job %s for user %s failed: %v", job.ID, userID, err)
							} else {
								for _, inc := range incidents {
									AddIncident(userID, inc)
								}
								// Update last run
								jobsMutex.Lock()
								jobs[userID][jobIdx].LastRun = time.Now()
								SaveJobs()
								jobsMutex.Unlock()
							}
						}(userID, job, i)
					}
				}
			}
			jobsMutex.RUnlock()
			// Sleep a short interval before checking again
			time.Sleep(5 * time.Second)
		}
	}
}

// RunLogScanJobFunc is the function type for running a log scan job
var RunLogScanJob = runLogScanJobImpl

// runLogScanJobImpl is the real implementation
func runLogScanJobImpl(userID string, job models.Job) ([]models.Incident, error) {
	// Set up k8s client (reuse logic from handlers)
	var config *rest.Config
	var err error
	config, err = rest.InClusterConfig()
	if err != nil {
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = os.ExpandEnv("$HOME/.kube/config")
		}
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, err
		}
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	// Fetch logs from selected pods in the namespace
	var podsToScan []string
	if len(job.Pods) > 0 {
		podsToScan = job.Pods
	} else {
		pds, err := clientset.CoreV1().Pods(job.Namespace).List(context.Background(), metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
		for _, pod := range pds.Items {
			podsToScan = append(podsToScan, pod.Name)
		}
	}
	var logs []string
	logLevels := make(map[string]bool)
	for _, lvl := range job.LogLevels {
		logLevels[strings.ToUpper(lvl)] = true
	}
	for _, podName := range podsToScan {
		var podObj *corev1.Pod
		pods, err := clientset.CoreV1().Pods(job.Namespace).List(context.Background(), metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
		for _, pod := range pods.Items {
			if pod.Name == podName {
				podObj = &pod
				break
			}
		}
		if podObj == nil {
			continue // pod not found
		}
		for _, c := range podObj.Spec.Containers {
			logOpts := &corev1.PodLogOptions{Container: c.Name, TailLines: int64Ptr(100)}
			reqLog := clientset.CoreV1().Pods(job.Namespace).GetLogs(podName, logOpts)
			stream, err := reqLog.Stream(context.Background())
			if err != nil {
				continue
			}
			b, err := io.ReadAll(stream)
			stream.Close()
			if err == nil {
				for _, line := range strings.Split(string(b), "\n") {
					for lvl := range logLevels {
						if strings.Contains(line, lvl) {
							logs = append(logs, line)
							break
						}
					}
				}
			}
		}
	}
	if len(logs) == 0 {
		return nil, nil
	}

	var incidents []models.Incident
	for _, logLine := range logs {
		// Only call selected microservices
		ms := make(map[string]bool)
		for _, m := range job.Microservices {
			ms[m] = true
		}
		// 1. Log Analyzer
		var analyzeResult map[string]interface{} = map[string]interface{}{"detail": "Not Run"}
		if ms["log_analyzer"] {
			analyzerURL := os.Getenv("LOG_ANALYZER_URL")
			analyzeReq := map[string]interface{}{"logs": []string{logLine}}
			analyzeBody, _ := json.Marshal(analyzeReq)
			analyzeResp, err := http.Post(analyzerURL, "application/json", bytes.NewReader(analyzeBody))
			if err == nil {
				defer analyzeResp.Body.Close()
				json.NewDecoder(analyzeResp.Body).Decode(&analyzeResult)
			}
		}
		// 2. Root Cause Predictor
		var predictResult map[string]interface{} = map[string]interface{}{"detail": "Not Run"}
		if ms["root_cause_predictor"] {
			predictorURL := os.Getenv("ROOT_CAUSE_PREDICTOR_URL")
			predictBody, _ := json.Marshal(map[string]interface{}{"logs": []string{logLine}})
			predictResp, err := http.Post(predictorURL, "application/json", bytes.NewReader(predictBody))
			if err == nil {
				defer predictResp.Body.Close()
				json.NewDecoder(predictResp.Body).Decode(&predictResult)
			}
		}
		// 3. Knowledge Base Search
		var kbResult map[string]interface{} = map[string]interface{}{"detail": "Not Run"}
		if ms["knowledge_base"] {
			kbURL := os.Getenv("KNOWLEDGE_BASE_URL")
			kbReq := map[string]interface{}{"query": predictResult["root_cause"]}
			kbBody, _ := json.Marshal(kbReq)
			kbResp, err := http.Post(kbURL, "application/json", bytes.NewReader(kbBody))
			if err == nil {
				defer kbResp.Body.Close()
				json.NewDecoder(kbResp.Body).Decode(&kbResult)
			}
		}
		// 4. Action Recommender
		var recResult map[string]interface{} = map[string]interface{}{"detail": "Not Run"}
		if ms["action_recommender"] {
			recommenderURL := os.Getenv("ACTION_RECOMMENDER_URL")
			recReq := map[string]interface{}{"root_cause": predictResult["root_cause"]}
			recBody, _ := json.Marshal(recReq)
			recResp, err := http.Post(recommenderURL, "application/json", bytes.NewReader(recBody))
			if err == nil {
				defer recResp.Body.Close()
				json.NewDecoder(recResp.Body).Decode(&recResult)
			}
		}
		// Create Incident
		incident := models.Incident{
			ID:        uuid.New().String(),
			UserID:    userID,
			JobID:     job.ID,
			Timestamp: time.Now(),
			LogLine:   logLine,
			Analysis:  toString(analyzeResult),
			RootCause: toString(predictResult),
			Knowledge: toString(kbResult),
			Action:    toString(recResult),
		}
		incidents = append(incidents, incident)
	}
	return incidents, nil
}

func int64Ptr(i int64) *int64 { return &i }

func toString(m map[string]interface{}) string {
	b, _ := json.Marshal(m)
	return string(b)
}

// StopScheduler stops the background scheduler (for graceful shutdown)
func StopScheduler() {
	if stopScheduler != nil {
		close(stopScheduler)
	}
}
