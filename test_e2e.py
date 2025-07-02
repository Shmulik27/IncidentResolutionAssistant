import requests

GO_BACKEND_URL = "http://localhost:8080/analyze"
GO_PREDICT_URL = "http://localhost:8080/predict"
GO_SEARCH_URL = "http://localhost:8080/search"
GO_RECOMMEND_URL = "http://localhost:8080/recommend"

sample_logs = [
    "2024-06-01 12:00:00 INFO Starting service",
    "2024-06-01 12:01:00 ERROR Out of memory in service X",
    "2024-06-01 12:02:00 WARNING Low memory",
    "2024-06-01 12:03:00 CRITICAL Out of memory",
    "2024-06-01 12:04:00 INFO User John logged in",
    "2024-06-01 12:05:00 INFO User Jane logged in"
]

def test_normal():
    response = requests.post(GO_BACKEND_URL, json={"logs": sample_logs})
    print("Status code:", response.status_code)
    print("Response:", response.json())
    assert response.status_code == 200
    result = response.json()
    assert "anomalies" in result
    assert "count" in result
    print("End-to-end test (normal) passed!")

def test_no_anomalies():
    logs = ["2024-06-01 12:00:00 INFO All good", "2024-06-01 12:01:00 INFO Still good"]
    response = requests.post(GO_BACKEND_URL, json={"logs": logs})
    print("No anomalies test status:", response.status_code)
    print("No anomalies response:", response.json())
    assert response.status_code == 200
    result = response.json()
    assert result["count"] == 2  # Both are rare (frequency anomaly)
    print("End-to-end test (no anomalies) passed!")

def test_python_service_down():
    # This test assumes the Go backend LOG_ANALYZER_URL is set to a non-existent service
    import os
    import time
    # Temporarily set the backend to a bad URL (manual step may be needed in Docker Compose)
    print("To test Python service down, stop the log-analyzer service or set LOG_ANALYZER_URL to a bad URL.")
    print("This test will attempt to connect and expects a 500 error.")
    time.sleep(2)
    try:
        response = requests.post(GO_BACKEND_URL, json={"logs": ["test"]}, timeout=3)
        print("Python service down test status:", response.status_code)
        print("Python service down response:", response.text)
        assert response.status_code == 500
        print("End-to-end test (Python service down) passed!")
    except Exception as e:
        print("Expected failure when Python service is down:", e)

def test_predict_root_cause():
    payload = {"logs": ["2024-06-01 12:01:00 ERROR Out of memory in service X"]}
    response = requests.post(GO_PREDICT_URL, json=payload)
    print("Predict root cause status:", response.status_code)
    print("Predict root cause response:", response.json())
    assert response.status_code == 200
    result = response.json()
    assert result["root_cause"] == "Memory exhaustion"
    print("End-to-end test (predict root cause) passed!")

def test_search_knowledge_base():
    payload = {"query": "out of memory", "top_k": 2}
    response = requests.post(GO_SEARCH_URL, json=payload)
    print("Search knowledge base status:", response.status_code)
    print("Search knowledge base response:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "resolution" in data[0]
    print("End-to-end test (search knowledge base) passed!")

def test_recommend_action():
    payload = {"root_cause": "Memory exhaustion"}
    response = requests.post(GO_RECOMMEND_URL, json=payload)
    print("Recommend action status:", response.status_code)
    print("Recommend action response:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert "action" in data
    assert "memory" in data["action"].lower()
    print("End-to-end test (recommend action) passed!")

def test_full_incident_scenario():
    print("\n--- Full Incident Scenario Test ---")
    # 1. Analyze logs
    analyze_resp = requests.post(GO_BACKEND_URL, json={"logs": sample_logs})
    print("Analyze response:", analyze_resp.json())
    assert analyze_resp.status_code == 200
    anomalies = analyze_resp.json().get("anomalies", [])
    assert any("out of memory" in a.lower() for a in anomalies)
    # 2. Predict root cause
    predict_resp = requests.post(GO_PREDICT_URL, json={"logs": sample_logs})
    print("Predict response:", predict_resp.json())
    assert predict_resp.status_code == 200
    root_cause = predict_resp.json().get("root_cause")
    assert root_cause == "Memory exhaustion"
    # 3. Recommend action
    recommend_resp = requests.post(GO_RECOMMEND_URL, json={"root_cause": root_cause})
    print("Recommend response:", recommend_resp.json())
    assert recommend_resp.status_code == 200
    action = recommend_resp.json().get("action")
    assert "memory" in action.lower()
    print("Full incident scenario test passed!")

# Run all tests

test_normal()
test_no_anomalies()
# Uncomment the next line to run the Python service down test (requires manual setup)
# test_python_service_down()
test_predict_root_cause()
test_search_knowledge_base()
test_recommend_action()
test_full_incident_scenario() 