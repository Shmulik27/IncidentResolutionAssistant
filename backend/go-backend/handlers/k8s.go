package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"bytes"
	"errors"
	"io"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"backend/go-backend/logger"
)

// K8sService abstracts Kubernetes operations for handlers
type K8sService interface {
	ListNamespaces() ([]string, error)
	ListPods(cluster, namespace string) ([]string, error)
	ScanLogs(req ScanLogsRequest) ([]map[string]interface{}, error)
}

// DefaultK8sService implements K8sService using current logic
// (for backward compatibility; refactor internals as needed)
type DefaultK8sService struct{}

// Request struct for ScanLogs
// (reuse this in handler decoding)
type ScanLogsRequest struct {
	ClusterConfig    map[string]interface{} `json:"cluster_config"`
	Namespaces       []string               `json:"namespaces"`
	PodLabels        map[string]string      `json:"pod_labels"`
	TimeRangeMinutes int                    `json:"time_range_minutes"`
	LogLevels        []string               `json:"log_levels"`
	SearchPatterns   []string               `json:"search_patterns"`
	MaxLinesPerPod   int                    `json:"max_lines_per_pod"`
}

// ListNamespaces returns all namespaces in the cluster
func (s DefaultK8sService) ListNamespaces() ([]string, error) {
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
			return nil, err
		}
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	nsList, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var namespaces []string
	for _, ns := range nsList.Items {
		namespaces = append(namespaces, ns.Name)
	}
	return namespaces, nil
}

// ListPods returns all pod names in a given cluster and namespace
func (s DefaultK8sService) ListPods(cluster, namespace string) ([]string, error) {
	if cluster == "" || namespace == "" {
		return nil, ErrInvalidPodRequest
	}
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
			return nil, err
		}
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	pods, err := clientset.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var podNames []string
	for _, pod := range pods.Items {
		podNames = append(podNames, pod.Name)
	}
	return podNames, nil
}

var ErrInvalidPodRequest = errors.New("missing cluster or namespace")

// ScanLogs runs the log scan and analysis flow for the given request
func (s DefaultK8sService) ScanLogs(req ScanLogsRequest) ([]map[string]interface{}, error) {
	if len(req.Namespaces) == 0 || req.Namespaces[0] == "" {
		return nil, ErrInvalidScanRequest
	}
	namespace := req.Namespaces[0]
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
			return nil, err
		}
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	pods, err := clientset.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	logLevels := make(map[string]bool)
	for _, lvl := range req.LogLevels {
		logLevels[strings.ToUpper(lvl)] = true
	}
	var logs []string
	for _, pod := range pods.Items {
		for _, c := range pod.Spec.Containers {
			logOpts := &corev1.PodLogOptions{Container: c.Name, TailLines: int64Ptr(100)}
			reqLog := clientset.CoreV1().Pods(namespace).GetLogs(pod.Name, logOpts)
			stream, err := reqLog.Stream(context.Background())
			if err != nil {
				continue
			}
			b, err := io.ReadAll(stream)
			stream.Close()
			if err == nil {
				for _, line := range strings.Split(string(b), "\n") {
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
		return []map[string]interface{}{}, nil
	}
	var results []map[string]interface{}
	for _, logLine := range logs {
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
		result := map[string]interface{}{
			"log":             logLine,
			"analysis":        analyzeResult,
			"root_cause":      predictResult,
			"knowledge":       kbResult,
			"recommendations": recResult,
		}
		results = append(results, result)
	}
	return results, nil
}

var ErrInvalidScanRequest = errors.New("missing namespace in scan request")

// Refactored handler: injects K8sService
func HandleK8sNamespaces(k8sService K8sService) http.HandlerFunc {
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
		json.NewEncoder(w).Encode(map[string][]string{"namespaces": namespaces})
	}
}

func HandleScanK8sLogs(k8sService K8sService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[K8s] HandleScanK8sLogs called from ", r.RemoteAddr)
		w.Header().Set("Content-Type", "application/json")
		var req ScanLogsRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			logger.Logger.Warn("[K8s] Invalid scan request: ", err)
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}
		results, err := k8sService.ScanLogs(req)
		if err != nil {
			if err == ErrInvalidScanRequest {
				logger.Logger.Warn("[K8s] Missing namespace in scan request")
				http.Error(w, "Missing namespace", http.StatusBadRequest)
				return
			}
			logger.Logger.Error("[K8s] Failed to scan logs: ", err)
			http.Error(w, "Failed to scan logs", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"results": results,
		})
	}
}

// GET /k8s-pods?cluster=...&namespace=...
func HandleK8sPods(k8sService K8sService) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger.Logger.Info("[K8s] HandleK8sPods called from ", r.RemoteAddr)
		cluster := r.URL.Query().Get("cluster")
		namespace := r.URL.Query().Get("namespace")
		podNames, err := k8sService.ListPods(cluster, namespace)
		if err != nil {
			if err == ErrInvalidPodRequest {
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
		json.NewEncoder(w).Encode(map[string][]string{"pods": podNames})
	}
}

func int64Ptr(i int64) *int64 { return &i }
