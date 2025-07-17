package services

// HealthService abstracts health check operations for handlers
type HealthService interface {
	HealthStatus() map[string]string
}

// DefaultHealthService implements HealthService using current logic
type DefaultHealthService struct{}

// HealthStatus returns the health status of the service
func (s DefaultHealthService) HealthStatus() map[string]string {
	return map[string]string{"status": "ok"}
}
