import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.api import app


@patch("app.api.get_github_repo")
@patch("app.api.get_jira_client")
def test_e2e_incident_flow(mock_jira: MagicMock, mock_github: MagicMock) -> None:
    client = TestClient(app)
    mock_repo = MagicMock()
    mock_github.return_value = mock_repo
    mock_repo.get_blame.return_value = []
    mock_repo.owner.login = "fallback"
    mock_jira.return_value.search_issues.return_value = []
    mock_jira.return_value.create_issue.return_value = MagicMock(key="JIRA-1")
    payload = {
        "error_summary": "NullPointerException",
        "error_details": "Stacktrace...",
        "file_path": "main.py",
        "line_number": 10,
    }
    response = client.post("/incident", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "jira_issue" in data


if __name__ == "__main__":
    test_e2e_incident_flow()
    print("E2E test passed.")
