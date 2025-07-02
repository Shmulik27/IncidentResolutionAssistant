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

response = requests.post(GO_BACKEND_URL, json={"logs": sample_logs})
print("Status code:", response.status_code)
print("Response:", response.json())

assert response.status_code == 200
result = response.json()
assert "anomalies" in result
assert "count" in result
print("End-to-end test passed!") 