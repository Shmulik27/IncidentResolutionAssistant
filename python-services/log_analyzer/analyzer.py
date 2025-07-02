from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import spacy
from collections import Counter

app = FastAPI()

nlp = spacy.load("en_core_web_sm")

class LogRequest(BaseModel):
    logs: List[str]

@app.post("/analyze")
def analyze_logs(request: LogRequest):
    keywords = ["ERROR", "Exception", "CRITICAL"]
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
    return {
        "anomalies": all_anomalies,
        "count": len(all_anomalies),
        "details": {
            "keyword": anomalies,
            "frequency": freq_anomalies,
            "entity": entity_anomalies
        }
    } 