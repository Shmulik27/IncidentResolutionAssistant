"""
API endpoints for the Root Cause Predictor Service.
"""

from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST
from common.fastapi_utils import add_cors, setup_logging, add_metrics_endpoint
from .models import PredictRequest
from .logic import predict_root_cause, get_metrics

app = FastAPI(
    title="Root Cause Predictor Service",
    description="Predicts the root cause of incidents based on log analysis.",
    version="1.0.0",
)
add_cors(app)

logger = setup_logging("root_cause_predictor")
add_metrics_endpoint(app, get_metrics, CONTENT_TYPE_LATEST)


@app.get("/health")
def health() -> dict[str, str]:
    logger.info("/health endpoint called.")
    from .logic import increment_requests_total

    increment_requests_total("/health")
    return {"status": "ok"}


@app.post("/predict")
def predict(request: PredictRequest) -> dict[str, str]:
    from .logic import increment_requests_total

    increment_requests_total("/predict")
    return predict_root_cause(request)
