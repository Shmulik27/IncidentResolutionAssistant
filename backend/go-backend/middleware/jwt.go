package middleware

import (
	"log"
	"net/http"

	"github.com/golang-jwt/jwt/v5"
)

type UserClaims struct {
	Email string   `json:"email"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
	jwt.RegisteredClaims
}

var JwtSecret []byte

func SetJwtSecret(secret string) {
	JwtSecret = []byte(secret)
}

func JWTAuthMiddleware(requiredRoles ...string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || len(header) < 8 || header[:7] != "Bearer " {
				http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
				return
			}
			tokenStr := header[7:]
			token, err := jwt.ParseWithClaims(tokenStr, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
				return JwtSecret, nil
			})
			if err != nil || !token.Valid {
				log.Printf("JWT parse error: %v", err)
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}
			claims, ok := token.Claims.(*UserClaims)
			if !ok {
				http.Error(w, "Invalid claims", http.StatusUnauthorized)
				return
			}
			if len(requiredRoles) > 0 {
				roleOk := false
				for _, required := range requiredRoles {
					for _, userRole := range claims.Roles {
						if userRole == required {
							roleOk = true
							break
						}
					}
				}
				if !roleOk {
					http.Error(w, "Insufficient permissions", http.StatusForbidden)
					return
				}
			}
			next(w, r)
		}
	}
}
