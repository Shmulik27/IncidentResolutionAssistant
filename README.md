# AI-Powered Incident Resolution Assistant for DevOps Teams

## Project Summary
A smart assistant that helps DevOps/SRE teams diagnose and resolve production issues faster using AI. It leverages log analysis, knowledge base search, root cause prediction, and action recommendation.

## Tech Stack
- Go (API server)
- Python (ML/NLP microservices)
- FAISS/Pinecone (vector search)
- spaCy, HuggingFace, scikit-learn (ML/NLP)
- Docker Compose (orchestration)

## Directory Structure
- `go-backend/` - Go API server
- `python-services/` - Python ML/NLP microservices
- `integrations/` - Log/metrics and chat integrations
- `data/` - Sample data
- `tests/` - Tests

## Running the Project
1. Copy `.env.example` to `.env` and fill in any required values.
2. Build and start all services:
   ```sh
   docker-compose up --build
   ```
3. The Go API will be available at `http://localhost:8080`.

---
This is a work in progress. See each service directory for more details. 