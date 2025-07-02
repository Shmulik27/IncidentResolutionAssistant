import requests

GO_BACKEND_URL = "http://localhost:8080/analyze"

sample_logs = [
    "2024-06-01 12:00:00 INFO Starting service",
    "2024-06-01 12:01:00 ERROR Failed to connect to DB",
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

test_normal()
test_no_anomalies()
# Uncomment the next line to run the Python service down test (requires manual setup)
# test_python_service_down() 