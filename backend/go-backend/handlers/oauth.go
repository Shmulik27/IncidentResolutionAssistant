package handlers

import (
	"backend/go-backend/middleware"
	"net/http"
)

func GoogleLoginHandler(w http.ResponseWriter, r *http.Request) {
	middleware.HandleGoogleLogin(w, r)
}

func GoogleCallbackHandler(usersFile string, jwtSecret []byte) http.HandlerFunc {
	return middleware.HandleGoogleCallback(usersFile, jwtSecret)
}
