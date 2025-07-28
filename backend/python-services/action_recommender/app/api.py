"""
API endpoints for the Action Recommender service.
"""

from fastapi import FastAPI, Response
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from app.logic import recommend_action_logic
from app.models import RecommendRequest, RecommendResponse, ActionRecommendation
import logging

app = FastAPI(
    title="Action Recommender Service",
    description="Recommends actions to resolve incidents based on analysis and knowledge base.",
    version="1.0.0",
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
def metrics() -> Response:
    """Return Prometheus metrics."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/recommend", response_model=RecommendResponse)
def recommend_action(request: RecommendRequest) -> RecommendResponse:
    """Recommend actions based on the request using AI."""
    REQUESTS_TOTAL.labels(endpoint="/recommend").inc()
    try:
        logger.info("Received recommend request: %s", request)
        recommendations = recommend_action_logic(request)

        # Convert dictionaries to ActionRecommendation objects
        formatted_recommendations = [
            ActionRecommendation(**rec) for rec in recommendations
        ]

        # Increment metrics for each recommendation
        for rec in formatted_recommendations:
            RECOMMENDATIONS_TOTAL.labels(endpoint="/recommend", action=rec.action).inc()

        return RecommendResponse(recommendations=formatted_recommendations)
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/recommend").inc()
        logger.error("Unexpected error in /recommend: %s", e)
        return RecommendResponse(
            recommendations=[ActionRecommendation(action="error", confidence=0.0)]
        )


__all__ = ["recommend_action"]
