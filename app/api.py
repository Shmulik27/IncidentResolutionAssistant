"""API endpoints for the Root Cause Predictor service."""

from fastapi import FastAPI
from prometheus_client import CONTENT_TYPE_LATEST
from app.models import PredictRequest
from app.logic import get_metrics

app = FastAPI(
    title="Root Cause Predictor Service",
    description="Predicts the root cause of incidents based on log analysis.",
    version="1.0.0"
)

# Placeholder for CORS and logging setup if needed
def setup_logging(name):
    """Set up logging for the service."""
    import logging
    return logging.getLogger(name)

def add_cors(app):
    """No-op CORS setup (placeholder)."""
    pass

def add_metrics_endpoint(app, func, content_type):
    """No-op metrics endpoint setup (placeholder)."""
    pass

add_cors(app)
logger = setup_logging("root_cause_predictor")
add_metrics_endpoint(app, get_metrics, CONTENT_TYPE_LATEST) 