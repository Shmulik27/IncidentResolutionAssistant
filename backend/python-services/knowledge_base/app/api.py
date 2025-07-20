"""
API endpoints for the Knowledge Base Service.
Provides vector search over incident knowledge base using FAISS and sentence transformers.
"""

from typing import List, cast
from fastapi import FastAPI
from pydantic import BaseModel
import faiss
from sentence_transformers import SentenceTransformer
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from common.fastapi_utils import add_cors, setup_logging, add_metrics_endpoint

app = FastAPI(
    title="Knowledge Base Service",
    description="Provides vector search capabilities over the incident knowledge base.",
    version="1.0.0"
)
add_cors(app)

# Prometheus metrics
REQUESTS_TOTAL = Counter('kb_search_requests_total', 'Total requests to knowledge base search', ['endpoint'])
ERRORS_TOTAL = Counter('kb_search_errors_total', 'Total errors in knowledge base search', ['endpoint'])
SEARCHES_TOTAL = Counter('kb_search_searches_total', 'Total searches made', ['endpoint'])

logger = setup_logging("vector_search")

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
index.add(incident_embeddings.reshape(-1, DIM))  # type: ignore

class SearchRequest(BaseModel):
    """Request model for searching incidents."""
    query: str
    top_k: int = 3

class SearchResult(BaseModel):
    """Response model for a single search result."""
    id: int
    text: str
    resolution: str
    score: float

add_metrics_endpoint(app, generate_latest, CONTENT_TYPE_LATEST)

@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint for the service."""
    logger.info("/health endpoint called.")
    REQUESTS_TOTAL.labels(endpoint="/health").inc()
    return {"status": "ok"}

@app.post("/search", response_model=List[SearchResult])
def search_incidents(request: SearchRequest) -> list[SearchResult]:
    """Search the knowledge base for incidents similar to the query."""
    REQUESTS_TOTAL.labels(endpoint="/search").inc()
    try:
        logger.info(f"Received search query: '{request.query}' (top_k={request.top_k})")
        if not request.query:
            logger.info("No query provided in request.")
            return []
        query_emb = MODEL.encode(cast(list[str], [str(request.query)]), convert_to_numpy=True)
        D, indices = index.search(query_emb, request.top_k)  # type: ignore
        results = []
        for idx, dist in zip(indices[0], D[0]):
            incident = INCIDENTS[idx]
            logger.info(f"Match: {incident['text']} (score={dist})")
            results.append(SearchResult(
                id=incident["id"],
                text=incident["text"],
                resolution=incident["resolution"],
                score=float(dist)
            ))
        SEARCHES_TOTAL.labels(endpoint="/search").inc()
        return results
    except Exception as e:
        ERRORS_TOTAL.labels(endpoint="/search").inc()
        logger.error(f"Error in /search: {e}")
        return [] 