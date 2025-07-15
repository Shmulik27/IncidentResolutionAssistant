from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import logging
from app.logic import recommend_action_logic
from app.models import RecommendRequest, RecommendResponse

app = FastAPI(
    title="Action Recommender Service",
    description="Recommends actions to resolve incidents based on analysis and knowledge base.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
REQUESTS_TOTAL = Counter('action_recommender_requests_total', 'Total requests to action recommender', ['endpoint'])
ERRORS_TOTAL = Counter('action_recommender_errors_total', 'Total errors in action recommender', ['endpoint'])
RECOMMENDATIONS_TOTAL = Counter('action_recommender_recommendations_total', 'Total recommendations made', ['endpoint', 'action'])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("action_recommender")

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    logger.info("/health endpoint called.")
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

@app.post("/recommend", response_model=RecommendResponse)
def recommend_action(request: RecommendRequest):
    REQUESTS_TOTAL.labels(endpoint="/recommend").inc()
    try:
        logger.info(f"Received root cause: {request.root_cause}")
        action = recommend_action_logic(request.root_cause)
        logger.info(f"Recommended action: {action}")
        RECOMMENDATIONS_TOTAL.labels(endpoint="/recommend", action=action).inc()
        return {"action": action}
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/recommend").inc()
        logger.error(f"Error in /recommend: {e}")
        return {"error": str(e)} 