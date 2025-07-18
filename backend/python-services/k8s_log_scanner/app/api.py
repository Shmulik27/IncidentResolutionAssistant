from fastapi import FastAPI, Response, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import yaml
import base64
import tempfile
import os
from datetime import datetime, timedelta
import subprocess
import json
import requests
import threading
import time
import uuid
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_429_TOO_MANY_REQUESTS
import time as pytime

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
RATE_LIMITED_TOTAL = Counter('k8s_scanner_rate_limited_total', 'Total rate limited requests', ['endpoint'])
VALIDATION_ERRORS_TOTAL = Counter('k8s_scanner_validation_errors_total', 'Total validation errors', ['endpoint'])
SCAN_LATENCY = Histogram('k8s_scanner_scan_latency_seconds', 'Latency for log scan', ['endpoint'])
ANALYSIS_LATENCY = Histogram('k8s_scanner_analysis_latency_seconds', 'Latency for incident analysis', ['endpoint'])

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("k8s_scanner")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
DEFAULT_CONFIG = {
    "LOG_ANALYZER_URL": "http://log-analyzer:8000/analyze",
    "ROOT_CAUSE_PREDICTOR_URL": "http://root-cause-predictor:8000/predict",
    "KNOWLEDGE_BASE_URL": "http://knowledge-base:8000/search",
    "ACTION_RECOMMENDER_URL": "http://action-recommender:8000/recommend",
    "INCIDENT_INTEGRATOR_URL": "http://incident-integrator:8000/incident",
    "ENABLE_INCIDENT_INTEGRATION": True,
    # Add feature flags or other config as needed
}

_config_cache = None
_config_mtime = None
_config_lock = threading.Lock()

def load_config():
    global _config_cache, _config_mtime
    with _config_lock:
        try:
            mtime = os.path.getmtime(CONFIG_PATH)
            if _config_cache is not None and _config_mtime == mtime:
                return _config_cache
            with open(CONFIG_PATH) as f:
                config = json.load(f)
            _config_cache = {**DEFAULT_CONFIG, **config}
            _config_mtime = mtime
            return _config_cache
        except FileNotFoundError:
            with open(CONFIG_PATH, "w") as f:
                json.dump(DEFAULT_CONFIG, f, indent=2)
            _config_cache = DEFAULT_CONFIG.copy()
            _config_mtime = os.path.getmtime(CONFIG_PATH)
            return _config_cache
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return DEFAULT_CONFIG.copy()

def save_config(new_config):
    with _config_lock:
        config = load_config()
        config.update(new_config)
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=2)
        # Update cache and mtime
        global _config_cache, _config_mtime
        _config_cache = config.copy()
        _config_mtime = os.path.getmtime(CONFIG_PATH)
        return config

@app.get("/config")
def get_config():
    config = load_config()
    # Mask secrets in GET
    masked = {}
    for k, v in config.items():
        if any(s in k for s in ["TOKEN", "SECRET", "PASSWORD", "WEBHOOK"]):
            masked[k] = "****" if v else ""
        else:
            masked[k] = v
    return masked

@app.post("/config")
def update_config(new_config: dict):
    config = save_config(new_config)
    return {"status": "ok", "config": config}

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

class IncidentAnalysisResults(BaseModel):
    analysis: Optional[dict] = None
    prediction: Optional[dict] = None
    search: Optional[list] = None
    recommendations: Optional[dict] = None

class LogScanAndAnalysisResponse(LogScanResponse):
    incident_analysis: Optional[IncidentAnalysisResults] = None
    incident_integration: Optional[dict] = None

# Service URLs (env or default)
# LOG_ANALYZER_URL = os.getenv("LOG_ANALYZER_URL", "http://log-analyzer:8000/analyze")
# ROOT_CAUSE_PREDICTOR_URL = os.getenv("ROOT_CAUSE_PREDICTOR_URL", "http://root-cause-predictor:8000/predict")
# KNOWLEDGE_BASE_URL = os.getenv("KNOWLEDGE_BASE_URL", "http://knowledge-base:8000/search")
# ACTION_RECOMMENDER_URL = os.getenv("ACTION_RECOMMENDER_URL", "http://action-recommender:8000/recommend")

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    logger.info("/health endpoint called.")
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

@app.get("/ready")
def readiness():
    config = load_config()
    dependencies = {
        "log_analyzer": config["LOG_ANALYZER_URL"].replace("/analyze", "/health"),
        "root_cause_predictor": config["ROOT_CAUSE_PREDICTOR_URL"].replace("/predict", "/health"),
        "knowledge_base": config["KNOWLEDGE_BASE_URL"].replace("/search", "/health"),
        "action_recommender": config["ACTION_RECOMMENDER_URL"].replace("/recommend", "/health"),
    }
    statuses = {}
    all_ok = True
    for name, url in dependencies.items():
        try:
            resp = requests.get(url, timeout=5)
            if resp.ok:
                statuses[name] = "ok"
            else:
                statuses[name] = f"error: {resp.status_code}"
                all_ok = False
        except Exception as e:
            statuses[name] = f"error: {str(e)}"
            all_ok = False
    if all_ok:
        return {"status": "ready", "dependencies": statuses}
    else:
        return Response(json.dumps({"status": "not ready", "dependencies": statuses}), status_code=503, media_type="application/json")

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

# Input validation limits
MAX_NAMESPACES = 10
MAX_LINES_PER_POD = 2000
MAX_TIME_RANGE_MINUTES = 1440  # 24 hours
MAX_SEARCH_PATTERNS = 10
MAX_PATTERN_LENGTH = 100

# Simple in-memory per-IP rate limiter
RATE_LIMIT = 5  # max requests
RATE_PERIOD = 60  # seconds
rate_limit_store = {}
rate_limit_lock = threading.Lock()

def check_rate_limit(ip):
    now = pytime.time()
    with rate_limit_lock:
        timestamps = rate_limit_store.get(ip, [])
        # Remove old timestamps
        timestamps = [t for t in timestamps if now - t < RATE_PERIOD]
        if len(timestamps) >= RATE_LIMIT:
            return False
        timestamps.append(now)
        rate_limit_store[ip] = timestamps
        return True

def validate_scan_request(request: LogScanRequest):
    if len(request.namespaces) > MAX_NAMESPACES:
        VALIDATION_ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=f"Too many namespaces (max {MAX_NAMESPACES})")
    if request.max_lines_per_pod > MAX_LINES_PER_POD:
        VALIDATION_ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=f"max_lines_per_pod exceeds limit ({MAX_LINES_PER_POD})")
    if request.time_range_minutes > MAX_TIME_RANGE_MINUTES:
        VALIDATION_ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=f"time_range_minutes exceeds limit ({MAX_TIME_RANGE_MINUTES})")
    if request.search_patterns and len(request.search_patterns) > MAX_SEARCH_PATTERNS:
        VALIDATION_ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=f"Too many search patterns (max {MAX_SEARCH_PATTERNS})")
    if request.search_patterns and any(len(p) > MAX_PATTERN_LENGTH for p in request.search_patterns):
        VALIDATION_ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=f"Search pattern too long (max {MAX_PATTERN_LENGTH} chars)")

def is_critical_root_cause(prediction):
    # Default list, could be made configurable
    critical_causes = [
        "Memory exhaustion", "Disk full", "Service unavailable", "Network timeout", "Permission issue", "Critical"
    ]
    rc = (prediction.get("root_cause") or prediction.get("prediction") or "").lower()
    return any(cause.lower() in rc for cause in critical_causes)

# Update scan_logs to accept job_id=None
@app.post("/scan-logs", response_model=LogScanAndAnalysisResponse)
def scan_logs(request: LogScanRequest, req: Request, job_id: str = ""):
    ip = req.client.host if req.client else 'unknown'
    if not check_rate_limit(ip):
        RATE_LIMITED_TOTAL.labels(endpoint="/scan-logs").inc()
        logger.warning(f"Rate limit exceeded for IP {ip}")
        raise HTTPException(status_code=HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded. Try again later.")
    validate_scan_request(request)
    REQUESTS_TOTAL.labels(endpoint="/scan-logs").inc()
    with SCAN_LATENCY.labels(endpoint="/scan-logs").time():
        try:
            logger.info(f"Starting log scan for cluster: {request.cluster_config.name} job_id={job_id}")
            kubeconfig_path = setup_kubeconfig(request.cluster_config)
            pods = get_pods_in_namespaces(
                kubeconfig_path,
                request.namespaces,
                request.pod_labels,
                request.cluster_config.context
            )
            all_logs = []
            pods_scanned = []
            errors = []
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
                    pod_logs = filter_logs_by_level(pod_logs, request.log_levels)
                    pod_logs = filter_logs_by_pattern(pod_logs, request.search_patterns)
                    if pod_logs:
                        all_logs.extend(pod_logs)
                        pods_scanned.append(f"{pod['namespace']}/{pod['name']}")
                        LOGS_SCANNED_TOTAL.labels(
                            cluster=request.cluster_config.name,
                            namespace=pod['namespace']
                        ).inc(len(pod_logs))
                except Exception as e:
                    error_msg = f"Failed to scan pod {pod['name']}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            if request.cluster_config.kubeconfig:
                try:
                    os.unlink(kubeconfig_path)
                except:
                    pass
            logger.info(f"Log scan completed. Found {len(all_logs)} log lines from {len(pods_scanned)} pods")
            incident_analysis = None
            config = load_config()
            LOG_ANALYZER_URL = config["LOG_ANALYZER_URL"]
            ROOT_CAUSE_PREDICTOR_URL = config["ROOT_CAUSE_PREDICTOR_URL"]
            KNOWLEDGE_BASE_URL = config["KNOWLEDGE_BASE_URL"]
            ACTION_RECOMMENDER_URL = config["ACTION_RECOMMENDER_URL"]
            if all_logs:
                logger.info(f"Starting incident analysis for job_id={job_id}")
                with ANALYSIS_LATENCY.labels(endpoint="/scan-logs").time():
                    try:
                        # Step 1: Log Analysis
                        try:
                            analysis_resp = requests.post(LOG_ANALYZER_URL, json={"logs": all_logs}, timeout=30)
                            analysis = analysis_resp.json() if analysis_resp.ok else {"error": analysis_resp.text}
                        except Exception as e:
                            logger.error(f"Log Analyzer call failed: {e}")
                            analysis = {"error": f"Log Analyzer call failed: {str(e)}"}

                        # Step 2: Root Cause Prediction
                        try:
                            prediction_resp = requests.post(ROOT_CAUSE_PREDICTOR_URL, json={"logs": all_logs}, timeout=30)
                            prediction = prediction_resp.json() if prediction_resp.ok else {"error": prediction_resp.text}
                        except Exception as e:
                            logger.error(f"Root Cause Predictor call failed: {e}")
                            prediction = {"error": f"Root Cause Predictor call failed: {str(e)}"}

                        # Step 3: Knowledge Search
                        try:
                            search_query = prediction.get("root_cause") or prediction.get("prediction") or "error"
                            search_resp = requests.post(KNOWLEDGE_BASE_URL, json={"query": search_query, "top_k": 5}, timeout=30)
                            search = search_resp.json() if search_resp.ok else [{"error": search_resp.text}]
                        except Exception as e:
                            logger.error(f"Knowledge Base call failed: {e}")
                            search = [{"error": f"Knowledge Base call failed: {str(e)}"}]

                        # Step 4: Action Recommendations
                        try:
                            recommendations_resp = requests.post(ACTION_RECOMMENDER_URL, json={"root_cause": search_query}, timeout=30)
                            recommendations = recommendations_resp.json() if recommendations_resp.ok else {"error": recommendations_resp.text}
                        except Exception as e:
                            logger.error(f"Action Recommender call failed: {e}")
                            recommendations = {"error": f"Action Recommender call failed: {str(e)}"}

                        incident_analysis = IncidentAnalysisResults(
                            analysis=analysis,
                            prediction=prediction,
                            search=search,
                            recommendations=recommendations
                        )
                    except Exception as e:
                        logger.error(f"Error in incident analysis flow (job_id={job_id}): {e}")
                        errors.append(f"Incident analysis error: {str(e)}")
            incident_integration = None
            if all_logs:
                # Incident integration
                config = load_config()
                if config.get("ENABLE_INCIDENT_INTEGRATION", True) and is_critical_root_cause(prediction):
                    try:
                        integrator_url = config.get("INCIDENT_INTEGRATOR_URL", "http://incident-integrator:8000/incident")
                        incident_payload = {
                            "error_summary": prediction.get("root_cause") or prediction.get("prediction"),
                            "error_details": str(analysis),
                            "file_path": "",
                            "line_number": 0
                        }
                        resp = requests.post(integrator_url, json=incident_payload, timeout=15)
                        if resp.ok:
                            incident_integration = resp.json()
                        else:
                            incident_integration = {"error": resp.text}
                        logger.info(f"Incident integration result: {incident_integration}")
                    except Exception as e:
                        logger.error(f"Incident integration failed: {e}")
                        incident_integration = {"error": str(e)}
            return LogScanAndAnalysisResponse(
                cluster_name=request.cluster_config.name,
                total_logs=len(all_logs),
                logs=all_logs,
                pods_scanned=pods_scanned,
                scan_time=datetime.now().isoformat(),
                errors=errors,
                incident_analysis=incident_analysis,
                incident_integration=incident_integration
            )
        except Exception as e:
            ERRORS_TOTAL.labels(endpoint="/scan-logs").inc()
            logger.error(f"Error in log scan (job_id={job_id}): {e}")
            raise HTTPException(status_code=500, detail=str(e))

# In-memory job store
scan_jobs = {}
scan_jobs_lock = threading.Lock()

# Update scan_logs_async to pass job_id
@app.post("/scan-logs-async")
def scan_logs_async(request: LogScanRequest, req: Request):
    ip = req.client.host if req.client else 'unknown'
    if not check_rate_limit(ip):
        RATE_LIMITED_TOTAL.labels(endpoint="/scan-logs-async").inc()
        logger.warning(f"Rate limit exceeded for IP {ip}")
        raise HTTPException(status_code=HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded. Try again later.")
    validate_scan_request(request)
    job_id = str(uuid.uuid4())
    with scan_jobs_lock:
        scan_jobs[job_id] = {"status": "pending", "result": None, "error": None}
    def run_job():
        try:
            result = scan_logs(request, req, job_id=job_id)
            with scan_jobs_lock:
                scan_jobs[job_id]["status"] = "complete"
                scan_jobs[job_id]["result"] = result
        except Exception as e:
            logger.error(f"Error in async scan job_id={job_id}: {e}")
            with scan_jobs_lock:
                scan_jobs[job_id]["status"] = "error"
                scan_jobs[job_id]["error"] = str(e)
    t = threading.Thread(target=run_job, daemon=True)
    t.start()
    logger.info(f"Started async scan job_id={job_id} for IP {ip}")
    return {"job_id": job_id}

@app.get("/scan-logs-job/{job_id}")
def get_scan_job(job_id: str):
    with scan_jobs_lock:
        job = scan_jobs.get(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if job["status"] == "complete":
            return {"status": "complete", "result": job["result"]}
        elif job["status"] == "error":
            return {"status": "error", "error": job["error"]}
        else:
            return {"status": job["status"]}

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