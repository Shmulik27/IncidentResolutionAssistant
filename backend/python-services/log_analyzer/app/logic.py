from collections import Counter as StdCounter
import os
import logging
from typing import Any
from .log_analyzer import (
    detect_anomalies_isolation_forest,
    detect_anomalies_zscore,
    preprocess_logs_nltk,
    preprocess_logs_spacy,
)

__all__ = ["analyze_logs_logic"]

DEFAULT_KEYWORDS = ["ERROR", "Exception", "CRITICAL"]
KEYWORDS = os.getenv("LOG_ANALYZER_KEYWORDS")
if KEYWORDS:
    keywords = [k.strip() for k in KEYWORDS.split(",") if k.strip()]
else:
    keywords = DEFAULT_KEYWORDS

logger = logging.getLogger("log_analyzer.logic")


def analyze_logs_logic(logs: list[str]) -> dict[str, Any]:
    """
    Analyze logs for anomalies using ML, keyword, frequency, and entity-based methods.
    Returns a dictionary with anomaly details.
    """
    anomalies = []
    freq_anomalies = []
    ml_anomalies = []

    # ML-based anomaly detection (Isolation Forest)
    ml_anomalies = [
        line
        for line, pred in zip(logs, detect_anomalies_isolation_forest(logs))
        if pred == -1
    ]

    # Statistical anomaly detection (Z-Score)
    zscore_anomalies = [
        line
        for line, is_anomaly in zip(logs, detect_anomalies_zscore(logs))
        if is_anomaly
    ]

    # Keyword-based anomaly detection
    for line in logs:
        if any(k in line for k in keywords):
            anomalies.append(line)

    # Frequency-based anomaly detection
    counts = StdCounter(logs)
    rare_lines = [line for line, count in counts.items() if count == 1]
    freq_anomalies.extend(rare_lines)

    # NLP Preprocessing (optional, for further analysis)
    processed_logs_nltk = preprocess_logs_nltk(logs)
    processed_logs_spacy = preprocess_logs_spacy(logs)

    all_anomalies = list(
        set(anomalies + freq_anomalies + zscore_anomalies + ml_anomalies)
    )
    return {
        "anomalies": all_anomalies,
        "count": len(all_anomalies),
        "details": {
            "keyword": anomalies,
            "frequency": freq_anomalies,
            "ml": ml_anomalies,
            "zscore": zscore_anomalies,
            "processed_nltk": processed_logs_nltk,
            "processed_spacy": processed_logs_spacy,
        },
    }
