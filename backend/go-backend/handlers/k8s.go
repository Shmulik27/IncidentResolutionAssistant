package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"bytes"
	"io"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

func HandleK8sNamespaces(w http.ResponseWriter, r *http.Request) {
	var config *rest.Config
	var err error

	// Try in-cluster config first
	config, err = rest.InClusterConfig()
	if err != nil {
		// Fallback to kubeconfig for local dev
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = os.ExpandEnv("$HOME/.kube/config")
		}
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			http.Error(w, "Failed to load kube config", http.StatusInternalServerError)
			return
		}
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		http.Error(w, "Failed to create k8s client", http.StatusInternalServerError)
		return
	}

	nsList, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		http.Error(w, "Failed to list namespaces", http.StatusInternalServerError)
		return
	}

	var namespaces []string
	for _, ns := range nsList.Items {
		namespaces = append(namespaces, ns.Name)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string][]string{"namespaces": namespaces})
}

func HandleScanK8sLogs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse request body for frontend scanRequest shape
	var req struct {
		ClusterConfig    map[string]interface{} `json:"cluster_config"`
		Namespaces       []string               `json:"namespaces"`
		PodLabels        map[string]string      `json:"pod_labels"`
		TimeRangeMinutes int                    `json:"time_range_minutes"`
		LogLevels        []string               `json:"log_levels"`
		SearchPatterns   []string               `json:"search_patterns"`
		MaxLinesPerPod   int                    `json:"max_lines_per_pod"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	if len(req.Namespaces) == 0 || req.Namespaces[0] == "" {
		http.Error(w, "Missing namespace", http.StatusBadRequest)
		return
	}
	namespace := req.Namespaces[0]

	// Set up k8s client (reuse logic from HandleK8sNamespaces)
	var config *rest.Config
	var err error
	config, err = rest.InClusterConfig()
	if err != nil {
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			kubeconfig = os.ExpandEnv("$HOME/.kube/config")
		}
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			http.Error(w, "Failed to load kube config", http.StatusInternalServerError)
			return
		}
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		http.Error(w, "Failed to create k8s client", http.StatusInternalServerError)
		return
	}

	// Fetch logs from all pods in the namespace
	pods, err := clientset.CoreV1().Pods(namespace).List(r.Context(), metav1.ListOptions{})
	if err != nil {
		http.Error(w, "Failed to list pods", http.StatusInternalServerError)
		return
	}
	var logs []string
	// Prepare log level filter
	logLevels := make(map[string]bool)
	for _, lvl := range req.LogLevels {
		logLevels[strings.ToUpper(lvl)] = true
	}
	for _, pod := range pods.Items {
		for _, c := range pod.Spec.Containers {
			logOpts := &corev1.PodLogOptions{Container: c.Name, TailLines: int64Ptr(100)}
			reqLog := clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, logOpts)
			stream, err := reqLog.Stream(r.Context())
			if err != nil {
				continue
			}
			defer stream.Close()
			b, err := io.ReadAll(stream)
			if err == nil {
				for _, line := range strings.Split(string(b), "\n") {
					// Only include lines that match one of the requested log levels
					for lvl := range logLevels {
						if strings.Contains(line, lvl) {
							logs = append(logs, line)
							break
						}
					}
				}
			}
		}
	}
	if len(logs) == 0 {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"logs": [], "message": "No logs found"}`))
		return
	}

	// For each log line, run the full analysis flow
	var results []map[string]interface{}
	for _, logLine := range logs {
		// 1. Log Analyzer
		analyzerURL := os.Getenv("LOG_ANALYZER_URL")
		analyzeReq := map[string]interface{}{"logs": []string{logLine}}
		analyzeBody, _ := json.Marshal(analyzeReq)
		analyzeResp, err := http.Post(analyzerURL, "application/json", bytes.NewReader(analyzeBody))
		var analyzeResult map[string]interface{}
		if err == nil {
			defer analyzeResp.Body.Close()
			json.NewDecoder(analyzeResp.Body).Decode(&analyzeResult)
		} else {
			analyzeResult = map[string]interface{}{"detail": "Not Found"}
		}

		// 2. Root Cause Predictor
		predictorURL := os.Getenv("ROOT_CAUSE_PREDICTOR_URL")
		predictBody, _ := json.Marshal(analyzeReq)
		predictResp, err := http.Post(predictorURL, "application/json", bytes.NewReader(predictBody))
		var predictResult map[string]interface{}
		if err == nil {
			defer predictResp.Body.Close()
			json.NewDecoder(predictResp.Body).Decode(&predictResult)
		} else {
			predictResult = map[string]interface{}{"detail": "Not Found"}
		}

		// 3. Knowledge Base Search
		kbURL := os.Getenv("KNOWLEDGE_BASE_URL")
		kbReq := map[string]interface{}{"query": predictResult["root_cause"]}
		kbBody, _ := json.Marshal(kbReq)
		kbResp, err := http.Post(kbURL, "application/json", bytes.NewReader(kbBody))
		var kbResult map[string]interface{}
		if err == nil {
			defer kbResp.Body.Close()
			json.NewDecoder(kbResp.Body).Decode(&kbResult)
		} else {
			kbResult = map[string]interface{}{"detail": "Not Found"}
		}

		// 4. Action Recommender
		recommenderURL := os.Getenv("ACTION_RECOMMENDER_URL")
		recReq := map[string]interface{}{"root_cause": predictResult["root_cause"]}
		recBody, _ := json.Marshal(recReq)
		recResp, err := http.Post(recommenderURL, "application/json", bytes.NewReader(recBody))
		var recResult map[string]interface{}
		if err == nil {
			defer recResp.Body.Close()
			json.NewDecoder(recResp.Body).Decode(&recResult)
		} else {
			recResult = map[string]interface{}{"detail": "Not Found"}
		}

		// Aggregate per log line
		result := map[string]interface{}{
			"log":             logLine,
			"analysis":        analyzeResult,
			"root_cause":      predictResult,
			"knowledge":       kbResult,
			"recommendations": recResult,
		}
		results = append(results, result)
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"results": results,
	})
}

func int64Ptr(i int64) *int64 { return &i }
