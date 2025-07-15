import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from ..integrator import app
from github import Github
from jira import JIRA

class TestIntegratorIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch("incident_integrator.integrator.Github")
    @patch("incident_integrator.integrator.JIRA")
    def test_incident_endpoint(self, mock_jira, mock_github):
        mock_repo = MagicMock()
        mock_github.return_value.get_repo.return_value = mock_repo
        mock_repo.get_blame.return_value = []
        mock_repo.owner.login = "fallback"
        mock_jira.return_value.search_issues.return_value = []
        mock_jira.return_value.create_issue.return_value = MagicMock(key="JIRA-1")
        response = self.client.post("/incident", json={
            "error_summary": "NullPointerException",
            "error_details": "Stacktrace...",
            "file_path": "main.py",
            "line_number": 10
        })
        self.assertEqual(response.status_code, 200)
        self.assertIn("jira_issue", response.json())

if __name__ == "__main__":
    unittest.main() 