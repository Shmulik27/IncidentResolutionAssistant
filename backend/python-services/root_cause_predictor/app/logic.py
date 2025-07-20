"""
Logic for the Root Cause Predictor Service.
Handles model training, prediction, and Prometheus metrics.
"""

import logging
import numpy as np
from prometheus_client import Counter, generate_latest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from .models import PredictRequest

__all__ = ["predict_root_cause", "get_metrics", "increment_requests_total"]

# Prometheus metrics
REQUESTS_TOTAL = Counter(
    'root_cause_predictor_requests_total',
    'Total requests to root cause predictor',
    ['endpoint']
)
ERRORS_TOTAL = Counter(
    'root_cause_predictor_errors_total',
    'Total errors in root cause predictor',
    ['endpoint']
)
PREDICTIONS_TOTAL = Counter(
    'root_cause_predictor_predictions_total',
    'Total predictions made',
    ['endpoint', 'root_cause']
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("root_cause_predictor")

# Training data
TRAIN_LOGS = [
    # Memory exhaustion
    "Out of memory error in service X",
    "Service X crashed due to memory exhaustion",
    "Memory limit exceeded in pod Y",
    "Killed process due to OOM",
    "OOMKilled event in Kubernetes",
    "High memory usage detected",
    "MemoryError in Python app",
    "Java heap space error",
    "Failed to allocate memory",
    "Memory leak suspected",
    # Disk full
    "Disk full on /dev/sda1",
    "No space left on device",
    "Write failed: disk quota exceeded",
    "Filesystem is full",
    "Cannot write to disk: out of space",
    "Disk usage at 100%",
    "Log rotation failed: disk full",
    "Database write error: disk full",
    "Insufficient disk space",
    "Disk cleanup required",
    # Network timeout
    "Database connection timeout",
    "Timeout while connecting to DB",
    "Request timed out",
    "Network timeout error",
    "Socket timeout exception",
    "API call timed out",
    "Connection timed out to service Z",
    "Timeout waiting for response",
    "Read timeout occurred",
    "Network latency too high",
    # Service unavailable
    "Connection refused by service Y",
    "Service Y is unavailable",
    "503 Service Unavailable",
    "Service not responding",
    "Failed to connect to service",
    "Service endpoint not reachable",
    "Service crashed unexpectedly",
    "Service restart required",
    "Service dependency unavailable",
    "Service health check failed",
    # Permission issue
    "Permission denied for file /etc/passwd",
    "Access denied to resource",
    "Unauthorized access attempt",
    "User does not have permission",
    "Operation not permitted",
    "Permission error on file write",
    "Insufficient privileges",
    "Permission denied executing script",
    "Access forbidden",
    "Permission denied by policy",
    # Unknown/irrelevant logs
    "INFO All good",
    "INFO Service started",
    "INFO User logged in",
    "INFO Health check passed",
    "INFO Scheduled job completed",
    "INFO Connection established",
    "INFO Request processed",
    "INFO Data saved to database",
    "INFO Cache hit",
    "INFO Configuration loaded",
    "INFO Shutdown initiated"
]
TRAIN_LABELS = [
    "Memory exhaustion"] * 10 + [
    "Disk full"] * 10 + [
    "Network timeout"] * 10 + [
    "Service unavailable"] * 10 + [
    "Permission issue"] * 10 + [
    "Unknown or not enough data"] * 11

vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(TRAIN_LOGS)
y_train = np.array(TRAIN_LABELS)
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)


def predict_root_cause(request: PredictRequest) -> dict[str, str]:
    """
    Predict the root cause of an incident based on the provided logs.
    Returns a dictionary with the predicted root cause or error message.
    """
    try:
        logger.info(f"Received {len(request.logs)} log lines for prediction.")
        if not request.logs:
            logger.info("No logs provided in request.")
            PREDICTIONS_TOTAL.labels(endpoint="/predict", root_cause="unknown").inc()
            return {"root_cause": "Unknown or not enough data"}
        joined_logs = " ".join(request.logs)
        X_query = vectorizer.transform([joined_logs])
        proba = model.predict_proba(X_query)[0]
        max_proba = np.max(proba)
        pred = model.classes_[np.argmax(proba)]
        if max_proba < 0.05:
            logger.info(f"Low confidence ({max_proba:.2f}) for prediction. Returning unknown.")
            PREDICTIONS_TOTAL.labels(endpoint="/predict", root_cause="unknown").inc()
            return {"root_cause": "Unknown or not enough data"}
        logger.info(f"Predicted root cause: {pred} (confidence: {max_proba:.2f})")
        PREDICTIONS_TOTAL.labels(endpoint="/predict", root_cause=pred).inc()
        return {"root_cause": pred}
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/predict").inc()
        logger.error(f"Error in /predict: {e}")
        return {"error": str(e)}


def increment_requests_total(endpoint: str) -> None:
    """
    Increment the Prometheus counter for total requests to a given endpoint.
    """
    REQUESTS_TOTAL.labels(endpoint=endpoint).inc()


def get_metrics() -> bytes:
    """
    Return the latest Prometheus metrics for the service.
    """
    return generate_latest() 