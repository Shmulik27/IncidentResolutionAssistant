from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import spacy
from collections import Counter
import os
import logging

app = FastAPI()

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

class LogRequest(BaseModel):
    logs: List[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
def analyze_logs(request: LogRequest):
    logger.info(f"Received {len(request.logs)} log lines for analysis.")
    anomalies = []
    entity_anomalies = []
    freq_anomalies = []

    # Keyword-based anomalies
    for line in request.logs:
        if any(k in line for k in keywords):
            anomalies.append(line)

    # Frequency analysis (flag rare lines)
    counts = Counter(request.logs)
    rare_lines = [line for line, count in counts.items() if count == 1]
    freq_anomalies.extend(rare_lines)

    # NLP-based entity extraction (flag lines with rare entities)
    all_entities = []
    for line in request.logs:
        doc = nlp(line)
        for ent in doc.ents:
            all_entities.append(ent.text)
    entity_counts = Counter(all_entities)
    rare_entities = {ent for ent, count in entity_counts.items() if count == 1}
    for line in request.logs:
        doc = nlp(line)
        if any(ent.text in rare_entities for ent in doc.ents):
            entity_anomalies.append(line)

    # Combine and deduplicate anomalies
    all_anomalies = list(set(anomalies + freq_anomalies + entity_anomalies))
    logger.info(f"Detected {len(all_anomalies)} anomalies.")
    return {
        "anomalies": all_anomalies,
        "count": len(all_anomalies),
        "details": {
            "keyword": anomalies,
            "frequency": freq_anomalies,
            "entity": entity_anomalies
        }
    } 