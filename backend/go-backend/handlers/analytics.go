package handlers

import (
	"backend/go-backend/logger"
	"encoding/json"
	"math/rand"
	"net/http"
	"time"
)

// AnalyticsService abstracts analytics operations for handlers
type AnalyticsService interface {
	GetAnalyticsData() (map[string]interface{}, error)
	GetServiceMetrics() (map[string]interface{}, error)
	GetPerformanceData() ([]map[string]interface{}, error)
	GetIncidentTrends() ([]map[string]interface{}, error)
	GetResourceUsage() (map[string]interface{}, error)
	GetK8sMetrics() (map[string]interface{}, error)
	GetRateLimitData() (map[string]interface{}, error)
}

// DefaultAnalyticsService implements AnalyticsService
type DefaultAnalyticsService struct{}

func (s *DefaultAnalyticsService) GetAnalyticsData() (map[string]interface{}, error) {
	serviceMetrics, _ := s.GetServiceMetrics()
	performanceData, _ := s.GetPerformanceData()
	incidentTrends, _ := s.GetIncidentTrends()
	resourceUsage, _ := s.GetResourceUsage()
	k8sMetrics, _ := s.GetK8sMetrics()

	return map[string]interface{}{
		"serviceMetrics":  serviceMetrics,
		"performanceData": performanceData,
		"incidentTrends":  incidentTrends,
		"resourceUsage":   resourceUsage,
		"k8sMetrics":      k8sMetrics,
		"testResults":     map[string]int{"passed": 10, "failed": 2, "skipped": 1},
		"lastUpdated":     time.Now().Format(time.RFC3339),
	}, nil
}

func (s *DefaultAnalyticsService) GetServiceMetrics() (map[string]interface{}, error) {
	// In a real implementation, this would fetch from Prometheus or service health checks
	services := []string{"log-analyzer", "root-cause-predictor", "knowledge-base", "action-recommender", "incident-integrator", "k8s-log-scanner"}
	metrics := make(map[string]interface{})

	for _, service := range services {
		// Simulate real metrics with some randomness
		uptime := 99.5 + rand.Float64()*0.5
		avgResponseTime := 50 + rand.Float64()*150
		totalRequests := 5000 + rand.Intn(15000)

		metrics[service] = map[string]interface{}{
			"uptime":          uptime,
			"avgResponseTime": avgResponseTime,
			"totalRequests":   totalRequests,
			"status":          "UP",
		}
	}

	return metrics, nil
}

func (s *DefaultAnalyticsService) GetPerformanceData() ([]map[string]interface{}, error) {
	// Generate performance data for the last 24 hours
	var data []map[string]interface{}
	now := time.Now()

	for i := 23; i >= 0; i-- {
		timePoint := now.Add(-time.Duration(i) * time.Hour)
		data = append(data, map[string]interface{}{
			"time":         timePoint.Format("15:04"),
			"responseTime": 80 + rand.Float64()*60,
			"throughput":   140 + rand.Float64()*60,
			"errors":       rand.Intn(7),
		})
	}

	return data, nil
}

func (s *DefaultAnalyticsService) GetIncidentTrends() ([]map[string]interface{}, error) {
	// Generate incident trends for the last 6 months
	months := []string{"Jan", "Feb", "Mar", "Apr", "May", "Jun"}
	var trends []map[string]interface{}

	for _, month := range months {
		incidents := 5 + rand.Intn(15)
		resolved := incidents - rand.Intn(3)
		avgResolutionTime := 1.5 + rand.Float64()*2.5

		trends = append(trends, map[string]interface{}{
			"month":             month,
			"incidents":         incidents,
			"resolved":          resolved,
			"avgResolutionTime": avgResolutionTime,
		})
	}

	return trends, nil
}

func (s *DefaultAnalyticsService) GetResourceUsage() (map[string]interface{}, error) {
	return map[string]interface{}{
		"cpu":     60 + rand.Float64()*20,
		"memory":  70 + rand.Float64()*15,
		"disk":    40 + rand.Float64()*20,
		"network": 75 + rand.Float64()*15,
	}, nil
}

func (s *DefaultAnalyticsService) GetK8sMetrics() (map[string]interface{}, error) {
	totalPods := 20 + rand.Intn(10)
	runningPods := totalPods - rand.Intn(3)

	return map[string]interface{}{
		"totalPods":       totalPods,
		"runningPods":     runningPods,
		"failedPods":      totalPods - runningPods,
		"totalNamespaces": 5 + rand.Intn(5),
		"activeClusters":  2 + rand.Intn(2),
	}, nil
}

func (s *DefaultAnalyticsService) GetRateLimitData() (map[string]interface{}, error) {
	currentUsage := 60 + rand.Float64()*30
	maxRequestsPerMinute := 1000
	currentRequests := int(currentUsage * float64(maxRequestsPerMinute) / 100)

	recentEvents := []map[string]interface{}{
		{
			"time":    time.Now().Add(-5 * time.Minute).Format("15:04"),
			"type":    "limit",
			"message": "Rate limit hit for /scan-logs",
			"count":   3,
		},
		{
			"time":    time.Now().Add(-10 * time.Minute).Format("15:04"),
			"type":    "warn",
			"message": "High request rate for /config",
			"count":   1,
		},
	}

	latencyDistribution := []map[string]interface{}{
		{"bucket": "<100ms", "count": 120 + rand.Intn(50)},
		{"bucket": "100-200ms", "count": 80 + rand.Intn(40)},
		{"bucket": "200-500ms", "count": 30 + rand.Intn(20)},
		{"bucket": ">500ms", "count": 5 + rand.Intn(10)},
	}

	return map[string]interface{}{
		"currentUsage":         currentUsage,
		"maxRequestsPerMinute": maxRequestsPerMinute,
		"currentRequests":      currentRequests,
		"recentEvents":         recentEvents,
		"latencyDistribution":  latencyDistribution,
	}, nil
}

// HandleAnalytics returns aggregated analytics data
func HandleAnalytics(analyticsService AnalyticsService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Analytics] Analytics endpoint called from ", r.RemoteAddr)

		data, err := analyticsService.GetAnalyticsData()
		if err != nil {
			logger.Logger.Error("[Analytics] Failed to get analytics data: ", err)
			http.Error(w, "Failed to get analytics data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(data); err != nil {
			logger.Logger.Error("[Analytics] Failed to encode analytics response:", err)
		}
	}
}

// HandleServiceMetrics returns service-specific metrics
func HandleServiceMetrics(analyticsService AnalyticsService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Analytics] Service metrics endpoint called from ", r.RemoteAddr)

		data, err := analyticsService.GetServiceMetrics()
		if err != nil {
			logger.Logger.Error("[Analytics] Failed to get service metrics: ", err)
			http.Error(w, "Failed to get service metrics", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(data); err != nil {
			logger.Logger.Error("[Analytics] Failed to encode service metrics response:", err)
		}
	}
}

// HandleRateLimitData returns rate limiting and latency data
func HandleRateLimitData(analyticsService AnalyticsService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[Analytics] Rate limit data endpoint called from ", r.RemoteAddr)

		data, err := analyticsService.GetRateLimitData()
		if err != nil {
			logger.Logger.Error("[Analytics] Failed to get rate limit data: ", err)
			http.Error(w, "Failed to get rate limit data", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(data); err != nil {
			logger.Logger.Error("[Analytics] Failed to encode rate limit data response:", err)
		}
	}
}
