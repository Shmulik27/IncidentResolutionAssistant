package main

import (
	"context"
	"log"
	"net/http"

	"os"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"backend/go-backend/handlers"
	"backend/go-backend/middleware"
)

var firebaseAuth *auth.Client
var TestMode = os.Getenv("TEST_MODE") == "1"

func InitFirebase() {
	credPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")
	app, err := firebase.NewApp(context.Background(), nil, option.WithCredentialsFile(credPath))
	if err != nil {
		log.Fatalf("Failed to initialize Firebase: %v", err)
	}
	firebaseAuth, err = app.Auth(context.Background())
	if err != nil {
		log.Fatalf("Failed to initialize Firebase Auth: %v", err)
	}
}

func FirebaseAuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if TestMode {
			// Inject a mock user for tests
			ctx := context.WithValue(r.Context(), "user", &auth.Token{UID: "test-user"})
			next(w, r.WithContext(ctx))
			return
		}
		header := r.Header.Get("Authorization")
		if header == "" || len(header) < 8 || header[:7] != "Bearer " {
			http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}
		tokenStr := header[7:]
		token, err := firebaseAuth.VerifyIDToken(r.Context(), tokenStr)
		if err != nil {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), "user", token)
		next(w, r.WithContext(ctx))

	}
}

func withCORS(handler http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		middleware.AddCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		handler(w, r)
	}
}

func main() {
	InitFirebase()

	// Public endpoints
	http.HandleFunc("/health", withCORS(handlers.HandleHealth))
	http.Handle("/metrics", withCORS(promhttp.Handler().ServeHTTP))
	http.HandleFunc("/metrics/stream", withCORS(handlers.MetricsStreamHandler))
	http.HandleFunc("/k8s-namespaces", withCORS(handlers.HandleK8sNamespaces))
	http.HandleFunc("/k8s-pods", withCORS(handlers.HandleK8sPods))
	http.HandleFunc("/scan-k8s-logs", withCORS(handlers.HandleScanK8sLogs))

	// Protected endpoints (require Firebase Auth)
	http.HandleFunc("/analyze", withCORS(FirebaseAuthMiddleware(handlers.HandleAnalyze)))

	// Log scan job management endpoints (all protected)
	http.HandleFunc("/api/log-scan-jobs", withCORS(FirebaseAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			handlers.HandleCreateLogScanJob(w, r)
		case http.MethodGet:
			handlers.HandleListLogScanJobs(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))
	http.HandleFunc("/api/log-scan-jobs/", withCORS(FirebaseAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			handlers.HandleDeleteLogScanJob(w, r)
			return
		} else if r.Method == http.MethodPut {
			handlers.HandleUpdateLogScanJob(w, r)
			return
		} else if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))
	http.HandleFunc("/api/incidents/recent", withCORS(FirebaseAuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handlers.HandleGetRecentIncidents(w, r)
			return
		} else if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))

	log.Println("Go backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
