"""Tests for the Action Recommender service."""

import sys
import os
from typing import Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from app.api import app, recommend_action
from app.models import RecommendRequest

client = TestClient(app)


def test_memory_exhaustion() -> None:
    req = RecommendRequest(query="Memory exhaustion")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence > 0


def test_disk_full() -> None:
    req = RecommendRequest(query="Disk full")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence > 0


def test_network_timeout() -> None:
    req = RecommendRequest(query="Network timeout")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence > 0


def test_service_unavailable() -> None:
    req = RecommendRequest(query="Service unavailable")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence > 0


def test_permission_issue() -> None:
    req = RecommendRequest(query="Permission issue")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence > 0


def test_unknown() -> None:
    req = RecommendRequest(query="Unknown or not enough data")
    result = recommend_action(req)
    assert len(result.recommendations) > 0
    assert result.recommendations[0].action != ""
    assert result.recommendations[0].confidence >= 0


def test_recommend_endpoint() -> None:
    payload = {"query": "Memory exhaustion"}
    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    data: Dict[str, Any] = response.json()
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["action"] != ""
    assert data["recommendations"][0]["confidence"] > 0
