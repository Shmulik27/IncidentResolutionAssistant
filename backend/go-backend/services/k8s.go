package services

import (
	"context"
	"errors"
	"io"
	"os"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

type K8sService interface {
	ListNamespaces() ([]string, error)
	ListPods(cluster, namespace string) ([]string, error)
	ScanLogs(req ScanLogsRequest) ([]map[string]interface{}, error)
}

type DefaultK8sService struct{}

type ScanLogsRequest struct {
	ClusterConfig    map[string]interface{} `json:"cluster_config"`
	Namespaces       []string               `json:"namespaces"`
	PodLabels        map[string]string      `json:"pod_labels"`
	TimeRangeMinutes int                    `json:"time_range_minutes"`
	LogLevels        []string               `json:"log_levels"`
	SearchPatterns   []string               `json:"search_patterns"`
	MaxLinesPerPod   int                    `json:"max_lines_per_pod"`
}

var ErrInvalidPodRequest = errors.New("missing cluster or namespace")
var ErrInvalidScanRequest = errors.New("missing namespace in scan request")

func (s *DefaultK8sService) ListNamespaces() ([]string, error) {
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

func (s *DefaultK8sService) ListPods(cluster, namespace string) ([]string, error) {
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

func (s *DefaultK8sService) ScanLogs(req ScanLogsRequest) ([]map[string]interface{}, error) {
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
		result := map[string]interface{}{
			"log": logLine,
		}
		results = append(results, result)
	}
	return results, nil
}

func int64Ptr(i int64) *int64 { return &i }
