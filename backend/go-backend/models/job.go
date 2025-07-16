package models

import "time"

// Job represents a scheduled log scan job for a user
type Job struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Name          string    `json:"name"`
	Cluster       string    `json:"cluster"`
	Namespace     string    `json:"namespace"`
	LogLevels     []string  `json:"log_levels"`
	Interval      int       `json:"interval"` // seconds
	CreatedAt     time.Time `json:"created_at"`
	LastRun       time.Time `json:"last_run"`
	Microservices []string  `json:"microservices"`
	Pods          []string  `json:"pods"`
}

// Incident represents a detected incident from a log scan
type Incident struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	JobID     string    `json:"job_id"`
	Timestamp time.Time `json:"timestamp"`
	LogLine   string    `json:"log_line"`
	Analysis  string    `json:"analysis"`
	RootCause string    `json:"root_cause"`
	Knowledge string    `json:"knowledge"`
	Action    string    `json:"action"`
}
