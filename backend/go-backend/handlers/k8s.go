package handlers

import (
	"encoding/json"
	"net/http"

	"backend/go-backend/logger"
	"backend/go-backend/services"
)

// Refactored handler: injects K8sService
func HandleK8sNamespaces(k8sService services.K8sService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[K8s] HandleK8sNamespaces called from ", r.RemoteAddr)
		namespaces, err := k8sService.ListNamespaces()
		if err != nil {
			logger.Logger.Error("[K8s] Failed to list namespaces: ", err)
			http.Error(w, "Failed to list namespaces", http.StatusInternalServerError)
			return
		}
		logger.Logger.WithField("namespaces", namespaces).Info("[K8s] Found namespaces")
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string][]string{"namespaces": namespaces}); err != nil {
			logger.Logger.Error("[K8s] Failed to encode namespaces response:", err)
		}
	}
}

func HandleScanK8sLogs(k8sService services.K8sService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[K8s] HandleScanK8sLogs called from ", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		var req services.ScanLogsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[K8s] Invalid scan request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		results, err := k8sService.ScanLogs(req)
		if err != nil {
			if err == services.ErrInvalidScanRequest {
				logger.Logger.Warn("[K8s] Missing namespace in scan request")
				http.Error(w, "Missing namespace", http.StatusBadRequest)
				return
			}
			logger.Logger.Error("[K8s] Failed to scan logs: ", err)
			http.Error(w, "Failed to scan logs", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"results": results,
		}); err != nil {
			logger.Logger.Error("[K8s] Failed to encode scan logs response:", err)
		}
	}
}

// GET /k8s-pods?cluster=...&namespace=...
func HandleK8sPods(k8sService services.K8sService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[K8s] HandleK8sPods called from ", r.RemoteAddr)
		cluster := r.URL.Query().Get("cluster")
		namespace := r.URL.Query().Get("namespace")
		podNames, err := k8sService.ListPods(cluster, namespace)
		if err != nil {
			if err == services.ErrInvalidPodRequest {
				logger.Logger.Warn("[K8s] Missing cluster or namespace in pods request")
				http.Error(w, "Missing cluster or namespace", http.StatusBadRequest)
				return
			}
			logger.Logger.Error("[K8s] Failed to list pods: ", err)
			http.Error(w, "Failed to list pods", http.StatusInternalServerError)
			return
		}
		logger.Logger.WithField("pods", len(podNames)).Info("[K8s] Found pods")
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string][]string{"pods": podNames}); err != nil {
			logger.Logger.Error("[K8s] Failed to encode pods response:", err)
		}
	}
}

// func int64Ptr(i int64) *int64 { return &i }
