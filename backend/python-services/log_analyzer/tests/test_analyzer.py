import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__) + '/..'))

import pytest
from fastapi.testclient import TestClient
from analyzer import app, analyze_logs, LogRequest

client = TestClient(app)

@pytest.fixture
def sample_logs():
    return [
        "2024-06-01 12:00:00 INFO Starting service",
        "2024-06-01 12:01:00 ERROR Failed to connect to DB",
        "2024-06-01 12:02:00 WARNING Low memory",
        "2024-06-01 12:03:00 CRITICAL Out of memory",
        "2024-06-01 12:04:00 INFO User John logged in",
        "2024-06-01 12:05:00 INFO User Jane logged in"
    ]

def test_keyword_anomaly_detection(sample_logs):
    req = LogRequest(logs=sample_logs)
    result = analyze_logs(req)
    assert "2024-06-01 12:01:00 ERROR Failed to connect to DB" in result["details"]["keyword"]
    assert "2024-06-01 12:03:00 CRITICAL Out of memory" in result["details"]["keyword"]


def test_frequency_anomaly_detection():
    logs = ["A", "A", "B", "C", "C", "D"]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    # B and D are rare (appear once)
    assert "B" in result["details"]["frequency"]
    assert "D" in result["details"]["frequency"]


def test_entity_anomaly_detection():
    logs = [
        "User John logged in",
        "User Jane logged in",
        "User John logged in"
    ]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    # Jane is a rare entity
    assert any("Jane" in line for line in result["details"]["entity"])


def test_analyze_endpoint(sample_logs):
    response = client.post("/analyze", json={"logs": sample_logs})
    assert response.status_code == 200
    data = response.json()
    assert "anomalies" in data
    assert data["count"] == len(data["anomalies"])

# --- Additional tests ---
def test_empty_logs():
    req = LogRequest(logs=[])
    result = analyze_logs(req)
    assert result["count"] == 0
    assert result["anomalies"] == []

def test_all_normal_logs():
    logs = ["INFO All good", "INFO Still good"]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    assert result["count"] == 2  # Both are rare (frequency anomaly)

def test_all_anomalous_logs():
    logs = ["ERROR A", "CRITICAL B", "Exception C"]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    assert result["count"] == 3
    for line in logs:
        assert line in result["anomalies"]

def test_only_rare_entities():
    logs = ["User Alice logged in", "User Bob logged in"]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    assert result["count"] >= 2
    assert any("Alice" in line for line in result["details"]["entity"])
    assert any("Bob" in line for line in result["details"]["entity"])

def test_large_log_set():
    logs = [f"INFO Line {i}" for i in range(1000)] + ["ERROR Out of memory"]
    req = LogRequest(logs=logs)
    result = analyze_logs(req)
    assert "ERROR Out of memory" in result["anomalies"]
    assert result["count"] >= 1

def test_malformed_input():
    # Missing 'logs' key
    response = client.post("/analyze", json={"notlogs": ["A", "B"]})
    assert response.status_code == 422
    # logs is not a list
    response = client.post("/analyze", json={"logs": "notalist"})
    assert response.status_code == 422 