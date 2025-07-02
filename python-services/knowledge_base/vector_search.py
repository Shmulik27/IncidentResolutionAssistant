from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import faiss
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

app = FastAPI()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vector_search")

# Example in-memory knowledge base
INCIDENTS = [
    {"id": 1, "text": "Service X crashed due to out of memory error", "resolution": "Restarted service X and increased memory limit"},
    {"id": 2, "text": "Database connection timeout from service Y", "resolution": "Checked network and restarted service Y"},
    {"id": 3, "text": "Disk full on /dev/sda1", "resolution": "Cleaned up old logs and freed space"},
    {"id": 4, "text": "Permission denied error when accessing /etc/passwd", "resolution": "Fixed file permissions"},
]

# Load sentence transformer model
MODEL = SentenceTransformer('all-MiniLM-L6-v2')

# Embed all incident texts
incident_texts = [incident["text"] for incident in INCIDENTS]
incident_embeddings = MODEL.encode(incident_texts, convert_to_numpy=True)

# Build FAISS index
DIM = incident_embeddings.shape[1]
index = faiss.IndexFlatL2(DIM)
index.add(incident_embeddings)

class SearchRequest(BaseModel):
    query: str
    top_k: int = 3

class SearchResult(BaseModel):
    id: int
    text: str
    resolution: str
    score: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/search", response_model=List[SearchResult])
def search_incidents(request: SearchRequest):
    logger.info(f"Received search query: '{request.query}' (top_k={request.top_k})")
    query_emb = MODEL.encode([request.query], convert_to_numpy=True)
    D, I = index.search(query_emb, request.top_k)
    results = []
    for idx, dist in zip(I[0], D[0]):
        incident = INCIDENTS[idx]
        logger.info(f"Match: {incident['text']} (score={dist})")
        results.append(SearchResult(
            id=incident["id"],
            text=incident["text"],
            resolution=incident["resolution"],
            score=float(dist)
        ))
    return results 