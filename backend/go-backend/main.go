package main

import (
	"context"
	"log"
	"net/http"

	"github.com/prometheus/client_golang/prometheus/promhttp"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"backend/go-backend/handlers"
	"backend/go-backend/middleware"
)

var firebaseAuth *auth.Client

func InitFirebase() {
	app, err := firebase.NewApp(context.Background(), nil, option.WithCredentialsFile("serviceAccountKey.json"))
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

	// Example protected endpoint
	http.HandleFunc("/analyze", withCORS(FirebaseAuthMiddleware(handlers.HandleAnalyze)))

	log.Println("Go backend listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
