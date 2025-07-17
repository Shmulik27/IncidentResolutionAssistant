package utils

import (
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

// JobStore abstracts job persistence
// (You can generate mocks for testing)
//
//go:generate mockgen -destination=../mocks/mock_jobstore.go -package=mocks . JobStore
type JobStore interface {
	GetJobs() map[string][]models.Job
	UpdateJobLastRun(userID string, jobIdx int, t time.Time)
	SaveJobs() error
}

// IncidentStore abstracts incident persistence
type IncidentStore interface {
	AddIncident(userID string, inc models.Incident) error
}

// TimeProvider abstracts time for testability
type TimeProvider interface {
	Now() time.Time
	Since(t time.Time) time.Duration
}

// RealTimeProvider implements TimeProvider using the standard library
// (for production use)
type RealTimeProvider struct{}

func (RealTimeProvider) Now() time.Time                  { return time.Now() }
func (RealTimeProvider) Since(t time.Time) time.Duration { return time.Since(t) }

// JobExecutor abstracts job execution (log scan, microservice calls)
type JobExecutor interface {
	Run(userID string, job models.Job) ([]models.Incident, error)
}

// Scheduler encapsulates the background job scheduling logic
// and allows for dependency injection and better testability.
type Scheduler struct {
	stopCh        chan struct{}
	sem           chan struct{}
	interval      time.Duration
	jobStore      JobStore
	incidentStore IncidentStore
	timeProvider  TimeProvider
	jobExecutor   JobExecutor
}

var (
	schedulerInstance *Scheduler
	schedulerOnce     sync.Once
	stopOnce          sync.Once // Add this for idempotent StopScheduler
)

// DefaultJobExecutor implements JobExecutor using the existing RunLogScanJob logic
// (wraps the current implementation for backward compatibility)
type DefaultJobExecutor struct{}

func (DefaultJobExecutor) Run(userID string, job models.Job) ([]models.Incident, error) {
	return RunLogScanJob(userID, job)
}

// DefaultJobStore implements JobStore using the current global jobs variable and functions
// (for backward compatibility; replace with persistent storage in the future)
type DefaultJobStore struct{}

func (DefaultJobStore) GetJobs() map[string][]models.Job {
	return jobs
}

func (DefaultJobStore) UpdateJobLastRun(userID string, jobIdx int, t time.Time) {
	jobs[userID][jobIdx].LastRun = t
}

func (DefaultJobStore) SaveJobs() error {
	SaveJobs()
	return nil // SaveJobs has no error return in current implementation
}

// DefaultIncidentStore implements IncidentStore using the current AddIncident function
// (for backward compatibility; replace with persistent storage in the future)
type DefaultIncidentStore struct{}

func (DefaultIncidentStore) AddIncident(userID string, inc models.Incident) error {
	AddIncident(userID, inc)
	return nil // AddIncident has no error return in current implementation
}

// NewScheduler creates a new Scheduler instance with optional dependencies
// If any dependency is nil, a default implementation is used.
func NewScheduler(jobStore JobStore, incidentStore IncidentStore, timeProvider TimeProvider, jobExecutor JobExecutor) *Scheduler {
	if timeProvider == nil {
		timeProvider = RealTimeProvider{}
	}
	if jobExecutor == nil {
		jobExecutor = DefaultJobExecutor{}
	}
	// TODO: Replace with real implementations for jobStore and incidentStore
	// For now, these are left nil and should be set by the caller or refactored in the future.
	return &Scheduler{
		stopCh:        make(chan struct{}),
		sem:           make(chan struct{}, MaxConcurrentJobs),
		interval:      5 * time.Second, // check interval
		jobStore:      jobStore,
		incidentStore: incidentStore,
		timeProvider:  timeProvider,
		jobExecutor:   jobExecutor,
	}
}

// StartScheduler launches the background job scheduler (call once on startup)
func StartScheduler() {
	schedulerOnce.Do(func() {
		schedulerInstance = NewScheduler(DefaultJobStore{}, DefaultIncidentStore{}, nil, nil)
		go schedulerInstance.Run()
	})
}

// Run starts the scheduler loop
func (s *Scheduler) Run() {
	Logger.Info("[Scheduler] Run loop started")
	for {
		select {
		case <-s.stopCh:
			Logger.Info("[Scheduler] Run loop stopped")
			return
		default:
			s.runSchedulingCycle()
			time.Sleep(s.interval)
		}
	}
}

// runSchedulingCycle checks all jobs and schedules those that are due
func (s *Scheduler) runSchedulingCycle() {
	Logger.Info("[Scheduler] Checking jobs in runSchedulingCycle")
	// jobsMutex.RLock() // No longer needed; handled in store if needed
	jobsMap := s.jobStore.GetJobs()
	for userID, userJobs := range jobsMap {
		for i, job := range userJobs {
			if s.shouldRunJob(job) {
				Logger.WithFields(map[string]interface{}{
					"job":           job.ID,
					"user":          userID,
					"namespace":     job.Namespace,
					"pods":          job.Pods,
					"logLevels":     job.LogLevels,
					"microservices": job.Microservices,
				}).Info("[Scheduler] Running job")
				s.sem <- struct{}{}
				go func(userID string, job models.Job, jobIdx int) {
					defer func() { <-s.sem }()
					s.executeJob(userID, job, jobIdx)
				}(userID, job, i)
			}
		}
	}
	// jobsMutex.RUnlock() // No longer needed
}

// shouldRunJob determines if a job is due to run
func (s *Scheduler) shouldRunJob(job models.Job) bool {
	shouldRun := s.timeProvider.Since(job.LastRun) >= time.Duration(job.Interval)*time.Second
	Logger.WithFields(map[string]interface{}{
		"job_id":         job.ID,
		"last_run":       job.LastRun,
		"interval":       job.Interval,
		"since_last_run": s.timeProvider.Since(job.LastRun).Seconds(),
		"should_run":     shouldRun,
	}).Info("[Scheduler] shouldRunJob check")
	return shouldRun
}

// executeJob runs the log scan and handles incidents and job state
func (s *Scheduler) executeJob(userID string, job models.Job, jobIdx int) {
	Logger.WithFields(map[string]interface{}{
		"job_id":  job.ID,
		"user_id": userID,
		"jobIdx":  jobIdx,
	}).Info("[Scheduler] Executing job")
	incidents, err := s.jobExecutor.Run(userID, job)
	if err != nil {
		Logger.WithFields(map[string]interface{}{
			"job":  job.ID,
			"user": userID,
		}).Error("[Scheduler] Job failed: ", err)
		return
	}
	Logger.WithFields(map[string]interface{}{
		"job":       job.ID,
		"user":      userID,
		"incidents": len(incidents),
	}).Info("[Scheduler] Job produced incidents")
	for _, inc := range incidents {
		Logger.WithFields(map[string]interface{}{
			"job":      inc.JobID,
			"log_line": inc.LogLine,
		}).Info("[Scheduler] Incident created")
		err := s.incidentStore.AddIncident(userID, inc)
		if err != nil {
			Logger.WithFields(map[string]interface{}{
				"job":      inc.JobID,
				"incident": inc.ID,
			}).Error("[Scheduler] Failed to store incident: ", err)
		}
	}
	// Update last run and save jobs using the store
	s.jobStore.UpdateJobLastRun(userID, jobIdx, s.timeProvider.Now())
	s.jobStore.SaveJobs()
}

// RunLogScanJobFunc is the function type for running a log scan job
var RunLogScanJob = runLogScanJobImpl

// runLogScanJobImpl is the real implementation
func runLogScanJobImpl(userID string, job models.Job) ([]models.Incident, error) {
	clientset, err := getK8sClient()
	if err != nil {
		return nil, err
	}

	podsToScan, err := getPodsToScan(clientset, job)
	if err != nil {
		return nil, err
	}

	logLevels := make(map[string]bool)
	for _, lvl := range job.LogLevels {
		logLevels[strings.ToUpper(lvl)] = true
	}

	logs, err := getLogsForPods(clientset, job.Namespace, podsToScan, logLevels)
	if err != nil {
		return nil, err
	}

	Logger.WithField("matched_logs", len(logs)).Info("[RunLogScanJob] Total matched logs")
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
		analyzeResult, predictResult, kbResult, recResult := callMicroservicesForLog(logLine, ms)
		// Create Incident
		title := job.Name
		service := job.Namespace
		severity := ""
		if strings.Contains(logLine, "CRITICAL") {
			severity = "Critical"
		} else if strings.Contains(logLine, "ERROR") {
			severity = "High"
		} else if strings.Contains(logLine, "WARN") {
			severity = "Medium"
		} else if strings.Contains(logLine, "INFO") {
			severity = "Low"
		}
		status := "Open"
		category := "General"
		if analyzeResult["category"] != nil {
			category = toString(map[string]interface{}{"category": analyzeResult["category"]})
		}
		created := time.Now()
		resolutionTime := 0.0 // Not resolved yet
		incident := models.Incident{
			ID:             uuid.New().String(),
			UserID:         userID,
			JobID:          job.ID,
			Timestamp:      created,
			LogLine:        logLine,
			Analysis:       toString(analyzeResult),
			RootCause:      toString(predictResult),
			Knowledge:      toString(kbResult),
			Action:         toString(recResult),
			Title:          title,
			Service:        service,
			Severity:       severity,
			Status:         status,
			Category:       category,
			ResolutionTime: resolutionTime,
		}
		incidents = append(incidents, incident)
	}
	return incidents, nil
}

// Helper to call microservices for a log line
func callMicroservicesForLog(logLine string, ms map[string]bool) (analyzeResult, predictResult, kbResult, recResult map[string]interface{}) {
	analyzeResult = map[string]interface{}{"detail": "Not Run"}
	predictResult = map[string]interface{}{"detail": "Not Run"}
	kbResult = map[string]interface{}{"detail": "Not Run"}
	recResult = map[string]interface{}{"detail": "Not Run"}
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
	if ms["root_cause_predictor"] {
		predictorURL := os.Getenv("ROOT_CAUSE_PREDICTOR_URL")
		predictBody, _ := json.Marshal(map[string]interface{}{"logs": []string{logLine}})
		predictResp, err := http.Post(predictorURL, "application/json", bytes.NewReader(predictBody))
		if err == nil {
			defer predictResp.Body.Close()
			json.NewDecoder(predictResp.Body).Decode(&predictResult)
		}
	}
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
	return
}

// Helper to get Kubernetes client
func getK8sClient() (*kubernetes.Clientset, error) {
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
	return kubernetes.NewForConfig(config)
}

// Helper to get pods to scan
func getPodsToScan(clientset *kubernetes.Clientset, job models.Job) ([]string, error) {
	if len(job.Pods) > 0 {
		return job.Pods, nil
	}
	pds, err := clientset.CoreV1().Pods(job.Namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var podsToScan []string
	for _, pod := range pds.Items {
		podsToScan = append(podsToScan, pod.Name)
	}
	return podsToScan, nil
}

// Helper to get logs for pods
func getLogsForPods(clientset *kubernetes.Clientset, namespace string, podsToScan []string, logLevels map[string]bool) ([]string, error) {
	var logs []string
	for _, podName := range podsToScan {
		var podObj *corev1.Pod
		pds, err := clientset.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
		if err != nil {
			return nil, err
		}
		for _, pod := range pds.Items {
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
			reqLog := clientset.CoreV1().Pods(namespace).GetLogs(podName, logOpts)
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
	return logs, nil
}

func int64Ptr(i int64) *int64 { return &i }

func toString(m map[string]interface{}) string {
	b, _ := json.Marshal(m)
	return string(b)
}

// StopScheduler stops the background scheduler (for graceful shutdown)
func StopScheduler() {
	stopOnce.Do(func() {
		if schedulerInstance != nil && schedulerInstance.stopCh != nil {
			close(schedulerInstance.stopCh)
		}
	})
}

// ResetSchedulerForTest resets the scheduler instance and sync.Once variables for test isolation
// Only use in tests!
func ResetSchedulerForTest() {
	schedulerInstance = nil
	schedulerOnce = sync.Once{}
	stopOnce = sync.Once{}
}
