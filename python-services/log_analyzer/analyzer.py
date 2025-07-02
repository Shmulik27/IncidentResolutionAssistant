from fastapi import FastAPI, Response
from pydantic import BaseModel
from typing import List
import spacy
from collections import Counter as StdCounter
import os
import logging
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
import scipy.sparse as sparse

app = FastAPI()

# Prometheus metrics
REQUESTS_TOTAL = Counter('log_analyzer_requests_total', 'Total requests to log analyzer', ['endpoint'])
ERRORS_TOTAL = Counter('log_analyzer_errors_total', 'Total errors in log analyzer', ['endpoint'])
ANOMALIES_TOTAL = Counter('log_analyzer_anomalies_total', 'Total anomalies detected', ['endpoint'])

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("log_analyzer")

nlp = spacy.load("en_core_web_sm")

# Configurable anomaly keywords
DEFAULT_KEYWORDS = ["ERROR", "Exception", "CRITICAL"]
KEYWORDS = os.getenv("LOG_ANALYZER_KEYWORDS")
if KEYWORDS:
    keywords = [k.strip() for k in KEYWORDS.split(",") if k.strip()]
    logger.info(f"Using custom anomaly keywords: {keywords}")
else:
    keywords = DEFAULT_KEYWORDS
    logger.info(f"Using default anomaly keywords: {keywords}")

# Synthetic normal logs for ML training
NORMAL_LOGS = [
    "INFO Service started successfully",
    "INFO User logged in",
    "INFO Health check passed",
    "INFO Scheduled job completed",
    "INFO Connection established",
    "INFO Request processed",
    "INFO Data saved to database",
    "INFO Cache hit",
    "INFO Configuration loaded",
    "INFO Shutdown initiated"
]

# Train Isolation Forest on normal logs (TF-IDF features)
vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(NORMAL_LOGS)
if sparse.issparse(X_train):
    X_train_dense = sparse.csr_matrix(X_train).toarray()
else:
    X_train_dense = np.array(X_train)
iso_forest = IsolationForest(contamination="auto", random_state=42)
iso_forest.fit(X_train_dense)

class LogRequest(BaseModel):
    logs: List[str]

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
        anomalies = []
        entity_anomalies = []
        freq_anomalies = []
        ml_anomalies = []

        logger.info("Starting ML-based anomaly detection.")
        X_test = vectorizer.transform(request.logs)
        X_test_dense = sparse.csr_matrix(X_test).toarray()
        preds = iso_forest.predict(X_test_dense)
        ml_anomalies = [line for line, pred in zip(request.logs, preds) if pred == -1]
        logger.info(f"ML-based anomaly detection found {len(ml_anomalies)} anomalies.")

        logger.info("Starting keyword-based anomaly detection.")
        for line in request.logs:
            if any(k in line for k in keywords):
                anomalies.append(line)
        logger.info(f"Keyword-based anomaly detection found {len(anomalies)} anomalies.")

        logger.info("Starting frequency-based anomaly detection.")
        counts = StdCounter(request.logs)
        rare_lines = [line for line, count in counts.items() if count == 1]
        freq_anomalies.extend(rare_lines)
        logger.info(f"Frequency-based anomaly detection found {len(freq_anomalies)} anomalies.")

        logger.info("Starting entity-based anomaly detection.")
        all_entities = []
        for line in request.logs:
            doc = nlp(line)
            for ent in doc.ents:
                all_entities.append(ent.text)
        entity_counts = StdCounter(all_entities)
        rare_entities = {ent for ent, count in entity_counts.items() if count == 1}
        for line in request.logs:
            doc = nlp(line)
            if any(ent.text in rare_entities for ent in doc.ents):
                entity_anomalies.append(line)
        logger.info(f"Entity-based anomaly detection found {len(entity_anomalies)} anomalies.")

        # Combine and deduplicate anomalies
        all_anomalies = list(set(anomalies + freq_anomalies + entity_anomalies + ml_anomalies))
        ANOMALIES_TOTAL.labels(endpoint="/analyze").inc(len(all_anomalies))
        logger.info(f"Detected {len(all_anomalies)} anomalies (ML: {len(ml_anomalies)}).")
        return {
            "anomalies": all_anomalies,
            "count": len(all_anomalies),
            "details": {
                "keyword": anomalies,
                "frequency": freq_anomalies,
                "entity": entity_anomalies,
                "ml": ml_anomalies
            }
        }
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/analyze").inc()
        logger.error(f"Error in /analyze: {e}")
        return {"error": str(e)} 