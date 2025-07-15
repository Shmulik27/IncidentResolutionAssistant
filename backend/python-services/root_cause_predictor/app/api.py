from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import logging
from .models import PredictRequest
from .logic import predict_root_cause


app = FastAPI(
    title="Root Cause Predictor Service",
    description="Predicts the root cause of incidents based on log analysis.",
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

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("root_cause_predictor")

@app.get("/metrics")
def metrics():
    from .logic import get_metrics
    return Response(get_metrics(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    logger.info("/health endpoint called.")
    from .logic import increment_requests_total
    increment_requests_total("/health")
    return {"status": "ok"}

@app.post("/predict")
def predict(request: PredictRequest):
    from .logic import increment_requests_total
    increment_requests_total("/predict")
    return predict_root_cause(request) 