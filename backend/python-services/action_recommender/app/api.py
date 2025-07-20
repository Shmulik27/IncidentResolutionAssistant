"""
API endpoints for the Action Recommender service.
"""

from fastapi import FastAPI, Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from app.logic import recommend_action_logic
from app.models import RecommendRequest, RecommendResponse
import logging

app = FastAPI(
    title="Action Recommender Service",
    description="Recommends actions to resolve incidents based on analysis and knowledge base.",
    version="1.0.0"
)

REQUESTS_TOTAL = Counter(
    "action_recommender_requests_total",
    "Total requests to action recommender",
    ["endpoint"],
)
ERRORS_TOTAL = Counter(
    "action_recommender_errors_total",
    "Total errors in action recommender",
    ["endpoint"],
)
RECOMMENDATIONS_TOTAL = Counter(
    "action_recommender_recommendations_total",
    "Total recommendations made",
    ["endpoint", "action"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("action_recommender")

@app.get("/metrics")
def metrics():
    """Return Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/recommend", response_model=RecommendResponse)
def recommend_action(request: RecommendRequest):
    """Recommend an action based on the request."""
    REQUESTS_TOTAL.labels(endpoint="/recommend").inc()
    try:
        logger.info("Received recommend request: %s", request)
        result = recommend_action_logic(request)
        RECOMMENDATIONS_TOTAL.labels(endpoint="/recommend", action=result.action).inc()
        return result
    except ValueError as e:
        ERRORS_TOTAL.labels(endpoint="/recommend").inc()
        logger.error("ValueError in /recommend: %s", e)
        return {"error": str(e)}
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/recommend").inc()
        logger.error("Unexpected error in /recommend: %s", e)
        return {"error": str(e)} 