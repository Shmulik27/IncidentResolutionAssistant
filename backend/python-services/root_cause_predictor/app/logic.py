"""
Logic for the Root Cause Predictor Service.
Handles model training, prediction, and Prometheus metrics.
"""

from prometheus_client import Counter
import logging
import numpy as np
from typing import Dict, Any, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from prometheus_client import generate_latest
from .models import PredictRequest
from .ai_analyzer import analyzer  # Import our new AI analyzer

__all__ = ["predict_root_cause", "get_metrics", "increment_requests_total"]

# Prometheus metrics
REQUESTS_TOTAL = Counter(
    "root_cause_predictor_requests_total",
    "Total requests to root cause predictor",
    ["endpoint"],
)
ERRORS_TOTAL = Counter(
    "root_cause_predictor_errors_total",
    "Total errors in root cause predictor",
    ["endpoint"],
)
PREDICTIONS_TOTAL = Counter(
    "root_cause_predictor_predictions_total",
    "Total predictions made",
    ["endpoint", "root_cause"],
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
    "INFO Shutdown initiated",
]
TRAIN_LABELS = (
    ["Memory exhaustion"] * 10
    + ["Disk full"] * 10
    + ["Network timeout"] * 10
    + ["Service unavailable"] * 10
    + ["Permission issue"] * 10
    + ["Unknown or not enough data"] * 11
)

vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(TRAIN_LOGS)
y_train = np.array(TRAIN_LABELS)
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)


def predict_root_cause(request: PredictRequest) -> Dict[str, Any]:
    """
    Predict the root cause of an issue based on log messages.

    Args:
        request (PredictRequest): Request containing log messages to analyze.

    Returns:
        dict: Dictionary containing root cause and confidence level.
    """
    try:
        # Process each log message and get predictions
        root_causes: List[str] = []
        confidences: List[float] = []
        for log in request.logs:
            root_cause, confidence = analyzer.predict(log)
            root_causes.append(root_cause)
            confidences.append(confidence)

        # If all confidences are too low, return unknown
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        if avg_confidence < 0.3:  # Threshold can be adjusted
            return {
                "root_cause": "Unknown or not enough data",  # Return display name
                "confidence": 0.0,  # Always return 0.0 for unknown
                "error": "Confidence too low",
            }

        # Get the most common root cause
        from collections import Counter

        most_common_root_cause = Counter(root_causes).most_common(1)[0][0]

        # Increment prediction counter
        PREDICTIONS_TOTAL.labels(
            endpoint="/predict", root_cause=most_common_root_cause
        ).inc()

        # Map internal root cause labels to display labels
        root_cause_display = {
            "memory_exhaustion": "Memory exhaustion",
            "disk_full": "Disk full",
            "network_failure": "Network failure",
            "Service unavailable": "Service unavailable",  # Already in display format
            "Permission issue": "Permission issue",  # Already in display format
            "unknown": "Unknown or not enough data",
        }

        display_root_cause = root_cause_display.get(
            most_common_root_cause, "Unknown or not enough data"
        )

        return {
            "root_cause": display_root_cause,
            "confidence": float(avg_confidence),
            "error": None,
        }
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        ERRORS_TOTAL.labels(endpoint="/predict").inc()
        return {
            "root_cause": "unknown",
            "confidence": 0.0,
            "error": str(e),
        }


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
