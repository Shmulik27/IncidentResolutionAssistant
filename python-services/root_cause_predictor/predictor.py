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

# Synthetic training data (log, root cause)
TRAIN_LOGS = [
    "Out of memory error in service X",
    "Service X crashed due to memory exhaustion",
    "Disk full on /dev/sda1",
    "No space left on device",
    "Database connection timeout",
    "Timeout while connecting to DB",
    "Connection refused by service Y",
    "Service Y is unavailable",
    "Permission denied for file /etc/passwd",
    "Access denied to resource"
]
TRAIN_LABELS = [
    "Memory exhaustion",
    "Memory exhaustion",
    "Disk full",
    "Disk full",
    "Network timeout",
    "Network timeout",
    "Service unavailable",
    "Service unavailable",
    "Permission issue",
    "Permission issue"
]

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
    pred = model.predict(X_query)[0]
    logger.info(f"Predicted root cause: {pred}")
    return {"root_cause": pred} 