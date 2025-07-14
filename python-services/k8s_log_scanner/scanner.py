from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import yaml
import base64
import tempfile
import os
from datetime import datetime, timedelta
import subprocess
import json

app = FastAPI(
    title="Kubernetes Log Scanner Service",
    description="Scans logs from EKS and GKE Kubernetes clusters for incident analysis.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
REQUESTS_TOTAL = Counter('k8s_scanner_requests_total', 'Total requests to k8s scanner', ['endpoint'])
ERRORS_TOTAL = Counter('k8s_scanner_errors_total', 'Total errors in k8s scanner', ['endpoint'])
LOGS_SCANNED_TOTAL = Counter('k8s_scanner_logs_scanned_total', 'Total log lines scanned', ['cluster', 'namespace'])

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("k8s_scanner")

class ClusterConfig(BaseModel):
    name: str
    type: str  # "eks" or "gke"
    kubeconfig: Optional[str] = None  # Base64 encoded kubeconfig
    context: Optional[str] = None
    service_account_token: Optional[str] = None
    cluster_url: Optional[str] = None

class LogScanRequest(BaseModel):
    cluster_config: ClusterConfig
    namespaces: List[str] = ["default"]
    pod_labels: Optional[Dict[str, str]] = None
    time_range_minutes: int = 60
    log_levels: List[str] = ["ERROR", "WARN", "CRITICAL"]
    search_patterns: Optional[List[str]] = None
    max_lines_per_pod: int = 1000

class LogScanResponse(BaseModel):
    cluster_name: str
    total_logs: int
    logs: List[str]
    pods_scanned: List[str]
    scan_time: str
    errors: List[str] = []

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    logger.info("/health endpoint called.")
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

def setup_kubeconfig(cluster_config: ClusterConfig) -> str:
    """Setup kubeconfig for the cluster and return the path"""
    if cluster_config.kubeconfig:
        # Decode base64 kubeconfig
        kubeconfig_data = base64.b64decode(cluster_config.kubeconfig).decode('utf-8')
        
        # Create temporary kubeconfig file
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False)
        temp_file.write(kubeconfig_data)
        temp_file.close()
        
        return temp_file.name
    else:
        # Use default kubeconfig
        return os.path.expanduser("~/.kube/config")

def execute_kubectl_command(cmd: List[str], kubeconfig_path: str, context: Optional[str] = None) -> str:
    """Execute kubectl command and return output"""
    full_cmd = ["kubectl", "--kubeconfig", kubeconfig_path] + cmd
    if context:
        full_cmd.extend(["--context", context])
    
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise Exception(f"kubectl command failed: {result.stderr}")
        return result.stdout
    except subprocess.TimeoutExpired:
        raise Exception("kubectl command timed out")
    except Exception as e:
        raise Exception(f"Failed to execute kubectl: {str(e)}")

def get_pods_in_namespaces(kubeconfig_path: str, namespaces: List[str], 
                          pod_labels: Optional[Dict[str, str]] = None, 
                          context: Optional[str] = None) -> List[Dict[str, str]]:
    """Get pods in specified namespaces"""
    pods = []
    
    for namespace in namespaces:
        try:
            # Get pods in namespace
            cmd = ["get", "pods", "-n", namespace, "-o", "json"]
            output = execute_kubectl_command(cmd, kubeconfig_path, context)
            pods_data = json.loads(output)
            
            for pod in pods_data.get('items', []):
                pod_name = pod['metadata']['name']
                pod_namespace = pod['metadata']['namespace']
                
                # Check if pod matches labels
                if pod_labels:
                    pod_labels_dict = pod['metadata'].get('labels', {})
                    if not all(pod_labels_dict.get(k) == v for k, v in pod_labels.items()):
                        continue
                
                # Check if pod is running
                if pod['status']['phase'] == 'Running':
                    pods.append({
                        'name': pod_name,
                        'namespace': pod_namespace
                    })
                    
        except Exception as e:
            logger.warning(f"Failed to get pods in namespace {namespace}: {e}")
            continue
    
    return pods

def get_pod_logs(kubeconfig_path: str, pod_name: str, namespace: str, 
                time_range_minutes: int, max_lines: int, 
                context: Optional[str] = None) -> List[str]:
    """Get logs from a specific pod"""
    try:
        # Calculate time range
        since_time = datetime.now() - timedelta(minutes=time_range_minutes)
        since_str = since_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Get logs
        cmd = [
            "logs", pod_name, "-n", namespace,
            "--since-time", since_str,
            "--tail", str(max_lines),
            "--timestamps"
        ]
        
        output = execute_kubectl_command(cmd, kubeconfig_path, context)
        return output.strip().split('\n') if output.strip() else []
        
    except Exception as e:
        logger.warning(f"Failed to get logs from pod {pod_name}: {e}")
        return []

def filter_logs_by_level(logs: List[str], log_levels: List[str]) -> List[str]:
    """Filter logs by log level"""
    if not log_levels:
        return logs
    
    filtered_logs = []
    for log in logs:
        if any(level in log.upper() for level in log_levels):
            filtered_logs.append(log)
    
    return filtered_logs

def filter_logs_by_pattern(logs: List[str], patterns: Optional[List[str]]) -> List[str]:
    """Filter logs by search patterns"""
    if not patterns:
        return logs
    
    filtered_logs = []
    for log in logs:
        if any(pattern.lower() in log.lower() for pattern in patterns):
            filtered_logs.append(log)
    
    return filtered_logs

@app.post("/scan-logs", response_model=LogScanResponse)
def scan_logs(request: LogScanRequest):
    REQUESTS_TOTAL.labels(endpoint="/scan-logs").inc()
    
    try:
        logger.info(f"Starting log scan for cluster: {request.cluster_config.name}")
        
        # Setup kubeconfig
        kubeconfig_path = setup_kubeconfig(request.cluster_config)
        
        # Get pods in specified namespaces
        pods = get_pods_in_namespaces(
            kubeconfig_path, 
            request.namespaces, 
            request.pod_labels,
            request.cluster_config.context
        )
        
        all_logs = []
        pods_scanned = []
        errors = []
        
        # Get logs from each pod
        for pod in pods:
            try:
                pod_logs = get_pod_logs(
                    kubeconfig_path,
                    pod['name'],
                    pod['namespace'],
                    request.time_range_minutes,
                    request.max_lines_per_pod,
                    request.cluster_config.context
                )
                
                # Filter logs by level
                pod_logs = filter_logs_by_level(pod_logs, request.log_levels)
                
                # Filter logs by pattern
                pod_logs = filter_logs_by_pattern(pod_logs, request.search_patterns)
                
                if pod_logs:
                    all_logs.extend(pod_logs)
                    pods_scanned.append(f"{pod['namespace']}/{pod['name']}")
                    
                    # Update metrics
                    LOGS_SCANNED_TOTAL.labels(
                        cluster=request.cluster_config.name,
                        namespace=pod['namespace']
                    ).inc(len(pod_logs))
                    
            except Exception as e:
                error_msg = f"Failed to scan pod {pod['name']}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        # Cleanup temporary kubeconfig
        if request.cluster_config.kubeconfig:
            try:
                os.unlink(kubeconfig_path)
            except:
                pass
        
        logger.info(f"Log scan completed. Found {len(all_logs)} log lines from {len(pods_scanned)} pods")
        
        return LogScanResponse(
            cluster_name=request.cluster_config.name,
            total_logs=len(all_logs),
            logs=all_logs,
            pods_scanned=pods_scanned,
            scan_time=datetime.now().isoformat(),
            errors=errors
        )
        
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        logger.error(f"Error in log scan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def extract_cluster_name(arn):
    # arn:aws:eks:region:account:cluster/CLUSTER_NAME
    return arn.split('/')[-1]

@app.get("/clusters")
def list_clusters():
    """List available clusters from kubeconfig"""
    REQUESTS_TOTAL.labels(endpoint="/clusters").inc()
    
    try:
        kubeconfig_path = os.path.expanduser("~/.kube/config")
        if not os.path.exists(kubeconfig_path):
            return {"clusters": []}
        
        cmd = ["config", "get-contexts"]
        output = execute_kubectl_command(cmd, kubeconfig_path)
        
        # Parse kubectl output manually since JSON format is not available
        lines = output.strip().split('\n')
        clusters = []
        
        # Skip header line
        for line in lines[1:]:
            if line.strip():
                parts = line.split()
                if len(parts) >= 3:
                    arn = parts[1] # This is the cluster ARN
                    name = extract_cluster_name(arn)
                    clusters.append({
                        "name": name,
                        "cluster": arn,
                        "user": arn  # or whatever is appropriate
                    })
        
        return {"clusters": clusters}
        
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/clusters").inc()
        logger.error(f"Error listing clusters: {e}")
        return {"clusters": [], "error": str(e)}

@app.get("/namespaces/{cluster_name:path}")
def list_namespaces(cluster_name: str):
    """List namespaces in a cluster"""
    REQUESTS_TOTAL.labels(endpoint="/namespaces").inc()
    
    try:
        kubeconfig_path = os.path.expanduser("~/.kube/config")
        cmd = ["get", "namespaces", "-o", "json"]
        output = execute_kubectl_command(cmd, kubeconfig_path, cluster_name)
        namespaces_data = json.loads(output)
        
        namespaces = []
        for ns in namespaces_data.get('items', []):
            namespaces.append(ns['metadata']['name'])
        
        return {"namespaces": namespaces}
        
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/namespaces").inc()
        logger.error(f"Error listing namespaces: {e}")
        return {"namespaces": [], "error": str(e)} 