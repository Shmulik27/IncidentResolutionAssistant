from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np
import logging

app = FastAPI()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("action_recommender")

# Synthetic training data
root_causes = [
    "Memory exhaustion",
    "Disk full",
    "Network timeout",
    "Service unavailable",
    "Permission issue",
    "Unknown or not enough data"
]
actions = [
    "Restart service and increase memory",
    "Clean up disk and free space",
    "Check network and retry",
    "Check service status and escalate",
    "Fix file permissions",
    "Escalate to SRE team"
]

# Train a simple ML model
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(root_causes)
y = np.array(actions)
model = LogisticRegression(max_iter=1000)
model.fit(X, y)

class RecommendRequest(BaseModel):
    root_cause: str

class RecommendResponse(BaseModel):
    action: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/recommend", response_model=RecommendResponse)
def recommend_action(request: RecommendRequest):
    logger.info(f"Received root cause: {request.root_cause}")
    X_query = vectorizer.transform([request.root_cause])
    action = model.predict(X_query)[0]
    logger.info(f"Recommended action: {action}")
    return {"action": action} 