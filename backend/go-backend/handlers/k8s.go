package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

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
