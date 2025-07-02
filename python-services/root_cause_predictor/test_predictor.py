import pytest
from fastapi.testclient import TestClient
from predictor import app, predict_root_cause, PredictRequest

client = TestClient(app)

def test_memory_exhaustion():
    req = PredictRequest(logs=["2024-06-01 ERROR Out of memory in service X"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Memory exhaustion"

def test_disk_full():
    req = PredictRequest(logs=["2024-06-01 disk full on /dev/sda1"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Disk full"

def test_network_timeout():
    req = PredictRequest(logs=["2024-06-01 connection timeout to DB"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Network timeout"

def test_service_unavailable():
    req = PredictRequest(logs=["2024-06-01 connection refused by service Y"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Service unavailable"

def test_permission_issue():
    req = PredictRequest(logs=["2024-06-01 permission denied for file /etc/passwd"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Permission issue"

def test_unknown():
    req = PredictRequest(logs=["2024-06-01 INFO All good"])
    result = predict_root_cause(req)
    assert result["root_cause"] == "Unknown or not enough data"

def test_predict_endpoint():
    payload = {"logs": ["2024-06-01 ERROR Out of memory in service X"]}
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    assert response.json()["root_cause"] == "Memory exhaustion" 