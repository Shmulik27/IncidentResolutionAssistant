package main

import (
	"log"
	"net/http"
	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	"backend/go-backend/handlers"
	"backend/go-backend/middleware"
)

func main() {
	// Init middleware (OAuth, JWT)
	middleware.InitGoogleOAuth()
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("Missing JWT_SECRET env var")
	}
	middleware.SetJwtSecret(jwtSecret)
	usersFile := "models/users.json"

	// Public endpoints
	http.HandleFunc("/health", handlers.HandleHealth)
	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/metrics/stream", handlers.MetricsStreamHandler)
	http.HandleFunc("/auth/google/login", handlers.GoogleLoginHandler)
	http.HandleFunc("/auth/google/callback", handlers.GoogleCallbackHandler(usersFile, []byte(jwtSecret)))

	// Protected endpoints (examples, add more as needed)
	// http.HandleFunc("/analyze", middleware.JWTAuthMiddleware()(handlers.AnalyzeHandler))
	// http.HandleFunc("/config", middleware.JWTAuthMiddleware("admin")(handlers.ConfigHandler))

	log.Println("Go backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
