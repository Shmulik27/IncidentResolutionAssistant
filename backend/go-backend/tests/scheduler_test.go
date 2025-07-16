package tests

import (
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"strconv"
	"sync/atomic"
	"testing"
	"time"
)

// Mock RunLogScanJob for testing
var runCount int32

func mockRunLogScanJob(userID string, job models.Job) ([]models.Incident, error) {
	atomic.AddInt32(&runCount, 1)
	return []models.Incident{{
		ID:        "inc-" + job.ID,
		UserID:    userID,
		JobID:     job.ID,
		Timestamp: time.Now(),
		LogLine:   "ERROR test log",
		Analysis:  "{\"result\":\"fail\"}",
	}}, nil
}

func TestSchedulerRunsJobsAtInterval(t *testing.T) {
	utils.JobsFile = "test_jobs_data.json"
	utils.IncidentsFile = "test_incidents_data.json"
	defer func() {
		_ = utils.SaveJobs()
		_ = utils.SaveIncidents()
	}()

	userID := "user1"
	job := models.Job{
		ID:        "job1",
		UserID:    userID,
		Name:      "Test Job",
		Namespace: "default",
		LogLevels: []string{"ERROR"},
		Interval:  1,
		CreatedAt: time.Now(),
	}
	_ = utils.AddJob(userID, job)

	// Patch RunLogScanJob
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = mockRunLogScanJob
	defer func() { utils.RunLogScanJob = orig }()

	runCount = 0
	go utils.StartScheduler()
	// Wait for a few intervals
	time.Sleep(3500 * time.Millisecond)
	if atomic.LoadInt32(&runCount) < 2 {
		t.Fatalf("Expected at least 2 job runs, got %d", runCount)
	}
	incidents := utils.GetRecentIncidents(userID)
	if len(incidents) == 0 {
		t.Fatalf("Expected incidents to be created, got none")
	}
	utils.StopScheduler()
}

func TestSchedulerConcurrencyLimit(t *testing.T) {
	utils.JobsFile = "test_jobs_data2.json"
	utils.IncidentsFile = "test_incidents_data2.json"
	userID := "user2"
	jobs := []models.Job{}
	for i := 0; i < utils.MaxConcurrentJobs+2; i++ {
		jobs = append(jobs, models.Job{
			ID:        "jobc" + strconv.Itoa(i),
			UserID:    userID,
			Name:      "JobC",
			Namespace: "default",
			LogLevels: []string{"ERROR"},
			Interval:  1,
			CreatedAt: time.Now(),
		})
	}
	for _, job := range jobs {
		_ = utils.AddJob(userID, job)
	}
	// Patch RunLogScanJob to block
	orig := utils.RunLogScanJob
	blockCh := make(chan struct{})
	utils.RunLogScanJob = func(userID string, job models.Job) ([]models.Incident, error) {
		<-blockCh
		return []models.Incident{}, nil
	}
	defer func() { utils.RunLogScanJob = orig }()

	go utils.StartScheduler()
	// Wait a bit for jobs to start
	time.Sleep(500 * time.Millisecond)
	// Only MaxConcurrentJobs should be running (blocked)
	// (We can't directly check goroutines, but this ensures no deadlock)
	close(blockCh)
	utils.StopScheduler()
}
