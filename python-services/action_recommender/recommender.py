from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np
import logging
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

app = FastAPI()

# Prometheus metrics
REQUESTS_TOTAL = Counter('action_recommender_requests_total', 'Total requests to action recommender', ['endpoint'])
ERRORS_TOTAL = Counter('action_recommender_errors_total', 'Total errors in action recommender', ['endpoint'])
RECOMMENDATIONS_TOTAL = Counter('action_recommender_recommendations_total', 'Total recommendations made', ['endpoint', 'action'])

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

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

@app.post("/recommend", response_model=RecommendResponse)
def recommend_action(request: RecommendRequest):
    REQUESTS_TOTAL.labels(endpoint="/recommend").inc()
    try:
        logger.info(f"Received root cause: {request.root_cause}")
        X_query = vectorizer.transform([request.root_cause])
        action = model.predict(X_query)[0]
        logger.info(f"Recommended action: {action}")
        RECOMMENDATIONS_TOTAL.labels(endpoint="/recommend", action=action).inc()
        return {"action": action}
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/recommend").inc()
        logger.error(f"Error in /recommend: {e}")
        return {"error": str(e)} 