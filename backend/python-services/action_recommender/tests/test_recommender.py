"""Tests for the Action Recommender service."""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from app.api import app, recommend_action
from app.models import RecommendRequest

client = TestClient(app)


def test_memory_exhaustion() -> None:
    req = RecommendRequest(query="Memory exhaustion")
    result = recommend_action(req)
    assert result.action == "restart_service"


def test_disk_full() -> None:
    req = RecommendRequest(query="Disk full")
    result = recommend_action(req)
    assert result.action == "free_disk_space"


def test_network_timeout() -> None:
    req = RecommendRequest(query="Network timeout")
    result = recommend_action(req)
    assert result.action == "retry_connection"


def test_service_unavailable() -> None:
    req = RecommendRequest(query="Service unavailable")
    result = recommend_action(req)
    assert result.action == "escalate_issue"


def test_permission_issue() -> None:
    req = RecommendRequest(query="Permission issue")
    result = recommend_action(req)
    assert result.action == "check_permissions"


def test_unknown() -> None:
    req = RecommendRequest(query="Unknown or not enough data")
    result = recommend_action(req)
    assert result.action == "escalate_issue"


def test_recommend_endpoint() -> None:
    payload = {"query": "Memory exhaustion"}
    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    assert response.json()["action"] == "restart_service"
