from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import logging
from app.logic import analyze_logs_logic
from app.models import LogRequest

app = FastAPI(
    title="Log Analyzer Service",
    description="Analyzes logs and extracts relevant information for incident resolution.",
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
REQUESTS_TOTAL = Counter('log_analyzer_requests_total', 'Total requests to log analyzer', ['endpoint'])
ERRORS_TOTAL = Counter('log_analyzer_errors_total', 'Total errors in log analyzer', ['endpoint'])
ANOMALIES_TOTAL = Counter('log_analyzer_anomalies_total', 'Total anomalies detected', ['endpoint'])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("log_analyzer")

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/health")
def health():
    logger.info("/health endpoint called.")
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

@app.post("/analyze")
def analyze_logs(request: LogRequest):
    REQUESTS_TOTAL.labels(endpoint="/analyze").inc()
    try:
        logger.info(f"Received {len(request.logs)} log lines for analysis.")
        if not request.logs:
            logger.info("No logs provided in request.")
            return {"anomalies": [], "count": 0, "details": {"keyword": [], "frequency": [], "entity": [], "ml": []}}
        result = analyze_logs_logic(request.logs)
        ANOMALIES_TOTAL.labels(endpoint="/analyze").inc(result["count"])
        logger.info(f"Detected {result['count']} anomalies.")
        return result
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/analyze").inc()
        logger.error(f"Error in /analyze: {e}")
        return {"error": str(e)} 