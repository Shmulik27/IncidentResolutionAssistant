import spacy
from collections import Counter as StdCounter
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import scipy.sparse as sparse
import os
import logging

nlp = spacy.load("en_core_web_sm")

DEFAULT_KEYWORDS = ["ERROR", "Exception", "CRITICAL"]
KEYWORDS = os.getenv("LOG_ANALYZER_KEYWORDS")
if KEYWORDS:
    keywords = [k.strip() for k in KEYWORDS.split(",") if k.strip()]
else:
    keywords = DEFAULT_KEYWORDS

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

vectorizer = TfidfVectorizer()
X_train = vectorizer.fit_transform(NORMAL_LOGS)
if sparse.issparse(X_train):
    X_train_dense = sparse.csr_matrix(X_train).toarray()
else:
    X_train_dense = np.array(X_train)
iso_forest = IsolationForest(contamination="auto", random_state=42)
iso_forest.fit(X_train_dense)

logger = logging.getLogger("log_analyzer.logic")

def analyze_logs_logic(logs):
    anomalies = []
    entity_anomalies = []
    freq_anomalies = []
    ml_anomalies = []

    # ML-based anomaly detection
    X_test = vectorizer.transform(logs)
    X_test_dense = sparse.csr_matrix(X_test).toarray()
    preds = iso_forest.predict(X_test_dense)
    ml_anomalies = [line for line, pred in zip(logs, preds) if pred == -1]

    # Keyword-based anomaly detection
    for line in logs:
        if any(k in line for k in keywords):
            anomalies.append(line)

    # Frequency-based anomaly detection
    counts = StdCounter(logs)
    rare_lines = [line for line, count in counts.items() if count == 1]
    freq_anomalies.extend(rare_lines)

    # Entity-based anomaly detection
    all_entities = []
    for line in logs:
        doc = nlp(line)
        for ent in doc.ents:
            all_entities.append(ent.text)
    entity_counts = StdCounter(all_entities)
    rare_entities = {ent for ent, count in entity_counts.items() if count == 1}
    for line in logs:
        doc = nlp(line)
        if any(ent.text in rare_entities for ent in doc.ents):
            entity_anomalies.append(line)

    all_anomalies = list(set(anomalies + freq_anomalies + entity_anomalies + ml_anomalies))
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