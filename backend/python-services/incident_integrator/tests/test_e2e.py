import os
import requests

def test_e2e_incident_flow():
    url = os.environ.get("INTEGRATOR_URL", "http://localhost:8000/incident")
    payload = {
        "error_summary": "NullPointerException",
        "error_details": "Stacktrace...",
        "file_path": "main.py",
        "line_number": 10
    }
    response = requests.post(url, json=payload)
    assert response.status_code == 200
    assert "jira_issue" in response.json()

if __name__ == "__main__":
    test_e2e_incident_flow()
    print("E2E test passed.") 