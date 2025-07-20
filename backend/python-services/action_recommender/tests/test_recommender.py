"""Tests for the Action Recommender service."""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from fastapi.testclient import TestClient
from app.api import app, recommend_action, RecommendRequest

client = TestClient(app)

def test_memory_exhaustion():
    req = RecommendRequest(root_cause="Memory exhaustion")
    result = recommend_action(req)
    assert "memory" in result["action"].lower()

def test_disk_full():
    req = RecommendRequest(root_cause="Disk full")
    result = recommend_action(req)
    assert "disk" in result["action"].lower()

def test_network_timeout():
    req = RecommendRequest(root_cause="Network timeout")
    result = recommend_action(req)
    assert "network" in result["action"].lower() or "retry" in result["action"].lower()

def test_service_unavailable():
    req = RecommendRequest(root_cause="Service unavailable")
    result = recommend_action(req)
    assert "service" in result["action"].lower() or "escalate" in result["action"].lower()

def test_permission_issue():
    req = RecommendRequest(root_cause="Permission issue")
    result = recommend_action(req)
    assert "permission" in result["action"].lower()

def test_unknown():
    req = RecommendRequest(root_cause="Unknown or not enough data")
    result = recommend_action(req)
    assert "escalate" in result["action"].lower()

def test_recommend_endpoint():
    payload = {"root_cause": "Memory exhaustion"}
    response = client.post("/recommend", json=payload)
    assert response.status_code == 200
    assert "memory" in response.json()["action"].lower() 