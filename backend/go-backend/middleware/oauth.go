package middleware

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"backend/go-backend/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var GoogleOauthConfig *oauth2.Config

func InitGoogleOAuth() {
	GoogleOauthConfig = &oauth2.Config{
		RedirectURL:  "http://localhost:8080/auth/google/callback",
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		Endpoint:     google.Endpoint,
	}
	if GoogleOauthConfig.ClientID == "" || GoogleOauthConfig.ClientSecret == "" {
		log.Fatal("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env var")
	}
}

func HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	url := GoogleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func HandleGoogleCallback(usersFile string, jwtSecret []byte) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Missing code", http.StatusBadRequest)
			return
		}
		token, err := GoogleOauthConfig.Exchange(r.Context(), code)
		if err != nil {
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}
		client := GoogleOauthConfig.Client(r.Context(), token)
		resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		if err != nil {
			http.Error(w, "Failed to get userinfo: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()
		body, _ := ioutil.ReadAll(resp.Body)
		var userInfo struct {
			Email string `json:"email"`
			Name  string `json:"name"`
		}
		if err := json.Unmarshal(body, &userInfo); err != nil {
			http.Error(w, "Failed to parse userinfo: "+err.Error(), http.StatusInternalServerError)
			return
		}
		users, _ := models.LoadUsers(usersFile)
		var user *models.User
		for i := range users {
			if users[i].Email == userInfo.Email {
				user = &users[i]
				break
			}
		}
		if user == nil {
			newUser := models.User{
				Email: userInfo.Email,
				Name:  userInfo.Name,
				Roles: []string{"admin"},
			}
			users = append(users, newUser)
			user = &users[len(users)-1]
			_ = models.SaveUsers(usersFile, users)
		}
		claims := UserClaims{
			Email: user.Email,
			Name:  user.Name,
			Roles: user.Roles,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			},
		}
		tokenJwt := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		signedToken, err := tokenJwt.SignedString(jwtSecret)
		if err != nil {
			http.Error(w, "Failed to sign JWT: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"token": signedToken})
	}
}
