from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import os
import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np

app = FastAPI()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("root_cause_predictor")

# Balanced synthetic training data (10 examples per class)
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

# Train a simple ML classifier
vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(TRAIN_LOGS)
y_train = np.array(TRAIN_LABELS)
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

class PredictRequest(BaseModel):
    logs: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/predict")
def predict_root_cause(request: PredictRequest):
    logger.info(f"Received {len(request.logs)} log lines for prediction.")
    if not request.logs:
        return {"root_cause": "Unknown or not enough data"}
    # Join all logs into a single string for prediction
    joined_logs = " ".join(request.logs)
    X_query = vectorizer.transform([joined_logs])
    proba = model.predict_proba(X_query)[0]
    max_proba = np.max(proba)
    pred = model.classes_[np.argmax(proba)]
    if max_proba < 0.05:
        logger.info(f"Low confidence ({max_proba:.2f}) for prediction. Returning unknown.")
        return {"root_cause": "Unknown or not enough data"}
    logger.info(f"Predicted root cause: {pred} (confidence: {max_proba:.2f})")
    return {"root_cause": pred} 