package utils

import "net/http"

func AddCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:3001": true,
		"http://localhost:3002": true,
		"http://127.0.0.1:3000": true,
		"http://127.0.0.1:3001": true,
		"http://127.0.0.1:3002": true,
	}
	if allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}
