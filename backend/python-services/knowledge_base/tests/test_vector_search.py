import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'app')))
from fastapi.testclient import TestClient
from app.api import app, search_incidents, SearchRequest

client = TestClient(app)

def test_search_memory() -> None:
    req = SearchRequest(query="out of memory", top_k=2)
    results = search_incidents(req)
    assert any("memory" in r.text.lower() for r in results)

def test_search_disk() -> None:
    req = SearchRequest(query="disk is full", top_k=2)
    results = search_incidents(req)
    assert any("disk" in r.text.lower() for r in results)

def test_search_permission() -> None:
    req = SearchRequest(query="permission denied", top_k=2)
    results = search_incidents(req)
    assert any("permission" in r.text.lower() for r in results)

def test_search_endpoint() -> None:
    payload = {"query": "database timeout", "top_k": 2}
    response = client.post("/search", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "resolution" in data[0] 