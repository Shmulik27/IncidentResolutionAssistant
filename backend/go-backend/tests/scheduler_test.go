package tests

import (
	"backend/go-backend/models"
	"backend/go-backend/utils"
	"os"
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
	utils.ResetSchedulerForTest()
	utils.ClearJobs()
	utils.ClearIncidents()
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
		LastRun:   time.Now().Add(-time.Hour), // Ensure job runs immediately
	}
	_ = utils.AddJob(userID, job)

	// Patch RunLogScanJob
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = mockRunLogScanJob
	defer func() { utils.RunLogScanJob = orig }()

	runCount = 0
	jobsBefore := utils.GetJobs(userID)
	if len(jobsBefore) > 0 {
		t.Logf("Before scheduler: LastRun = %v", jobsBefore[0].LastRun)
	}
	go utils.StartScheduler()
	time.Sleep(100 * time.Millisecond) // Give the scheduler goroutine time to start
	// Wait for a few intervals (increase to 5s for robustness)
	time.Sleep(5000 * time.Millisecond)
	jobsAfter := utils.GetJobs(userID)
	if len(jobsAfter) > 0 {
		t.Logf("After scheduler: LastRun = %v", jobsAfter[0].LastRun)
	}
	t.Logf("[DEBUG] runCount = %d", runCount)
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
	utils.ClearJobs()
	utils.ClearIncidents()
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
			LastRun:   time.Now().Add(-time.Hour), // Ensure job runs immediately
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

func TestJobRunsImmediatelyAfterCreation(t *testing.T) {
	utils.ResetSchedulerForTest()
	utils.ClearJobs()
	utils.ClearIncidents()
	utils.JobsFile = "test_jobs_data_immediate.json"
	defer func() {
		if err := os.Remove(utils.JobsFile); err != nil {
			t.Errorf("failed to remove jobs file: %v", err)
		}
	}()

	userID := "immediateuser"
	job := models.Job{
		ID:        "job-immediate",
		UserID:    userID,
		Name:      "Immediate Job",
		Namespace: "default",
		LogLevels: []string{"ERROR"},
		Interval:  1,
		CreatedAt: time.Now(),
		LastRun:   time.Now().Add(-time.Hour), // Ensure job runs immediately
	}
	_ = utils.AddJob(userID, job)

	// Patch RunLogScanJob to always return a test incident
	orig := utils.RunLogScanJob
	utils.RunLogScanJob = func(userID string, job models.Job) ([]models.Incident, error) {
		return []models.Incident{{
			ID:        "inc-immediate-" + job.ID,
			UserID:    userID,
			JobID:     job.ID,
			Timestamp: time.Now(),
			LogLine:   "ERROR immediate test log",
			Analysis:  "{\"result\":\"immediate\"}",
		}}, nil
	}
	defer func() { utils.RunLogScanJob = orig }()

	jobsBefore := utils.GetJobs(userID)
	if len(jobsBefore) > 0 {
		t.Logf("Before scheduler: LastRun = %v", jobsBefore[0].LastRun)
	}
	go utils.StartScheduler()
	time.Sleep(100 * time.Millisecond) // Give the scheduler goroutine time to start
	// Wait longer for robustness
	time.Sleep(2500 * time.Millisecond)
	utils.StopScheduler()

	jobs := utils.GetJobs(userID)
	if len(jobs) > 0 {
		t.Logf("After scheduler: LastRun = %v", jobs[0].LastRun)
	}
	if len(jobs) == 0 {
		t.Fatalf("No jobs found for user")
	}
	if jobs[0].LastRun.IsZero() {
		t.Fatalf("LastRun was not updated after scheduler ran: %+v", jobs[0])
	}
	if time.Since(jobs[0].LastRun) > 5*time.Second {
		t.Fatalf("LastRun is too old: %v", jobs[0].LastRun)
	}
}
