package handlers

import (
	"backend/go-backend/logger"
	"encoding/json"
	"net/http"
)

// ConfigService abstracts configuration operations for handlers
type ConfigService interface {
	GetConfiguration() (map[string]interface{}, error)
	UpdateConfiguration(config map[string]interface{}) (map[string]interface{}, error)
}

// DefaultConfigService implements ConfigService
type DefaultConfigService struct{}

func (s *DefaultConfigService) GetConfiguration() (map[string]interface{}, error) {
	// Return default configuration
	return map[string]interface{}{
		"log_analyzer_url":          "http://localhost:8001",
		"root_cause_predictor_url":  "http://localhost:8002",
		"knowledge_base_url":        "http://localhost:8003",
		"action_recommender_url":    "http://localhost:8004",
		"incident_integrator_url":   "http://localhost:8005",
		"enable_auto_analysis":      true,
		"enable_jira_integration":   true,
		"enable_github_integration": true,
		"enable_notifications":      true,
		"request_timeout":           30,
		"max_retries":               3,
		"log_level":                 "INFO",
		"cache_ttl":                 60,
		"GITHUB_REPO":               "",
		"GITHUB_TOKEN":              "****",
		"JIRA_SERVER":               "",
		"JIRA_USER":                 "",
		"JIRA_TOKEN":                "****",
		"JIRA_PROJECT":              "",
		"WEBHOOK_SECRET":            "****",
		"SLACK_WEBHOOK_URL":         "****",
	}, nil
}

func (s *DefaultConfigService) UpdateConfiguration(config map[string]interface{}) (map[string]interface{}, error) {
	// In a real implementation, this would save to a database or config file
	// For now, just return the updated config
	logger.Logger.Info("[Config] Configuration updated: ", config)
	return map[string]interface{}{
		"config":  config,
		"message": "Configuration updated successfully",
	}, nil
}

// HandleGetConfiguration returns the current configuration
func HandleGetConfiguration(configService ConfigService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Config] Get configuration endpoint called from ", r.RemoteAddr)

		config, err := configService.GetConfiguration()
		if err != nil {
			logger.Logger.Error("[Config] Failed to get configuration: ", err)
			http.Error(w, "Failed to get configuration", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(config)
	}
}

// HandleUpdateConfiguration updates the configuration
func HandleUpdateConfiguration(configService ConfigService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Config] Update configuration endpoint called from ", r.RemoteAddr)

		var config map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
			logger.Logger.Error("[Config] Invalid configuration request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		result, err := configService.UpdateConfiguration(config)
		if err != nil {
			logger.Logger.Error("[Config] Failed to update configuration: ", err)
			http.Error(w, "Failed to update configuration", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
