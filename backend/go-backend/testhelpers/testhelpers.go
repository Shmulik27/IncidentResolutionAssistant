package testhelpers

import (
	"context"
	"net/http"

	"backend/go-backend/utils"

	"firebase.google.com/go/v4/auth"
)

// WithUser returns a new request with the user context set to a mock auth.Token with the given UID.
func WithUser(r *http.Request, userID string) *http.Request {
	token := &auth.Token{UID: userID}
	ctx := context.WithValue(r.Context(), utils.UserCtxKey, token)
	return r.WithContext(ctx)
}
