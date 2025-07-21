import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.api import app


class TestIntegratorIntegration(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    @patch("app.api.get_github_repo")
    @patch("app.api.get_jira_client")
    def test_incident_endpoint(
        self, mock_jira: MagicMock, mock_github: MagicMock
    ) -> None:
        mock_repo = MagicMock()
        mock_github.return_value = mock_repo
        mock_repo.get_blame.return_value = []
        mock_repo.owner.login = "fallback"
        mock_jira.return_value.search_issues.return_value = []
        mock_jira.return_value.create_issue.return_value = MagicMock(key="JIRA-1")
        response = self.client.post(
            "/incident",
            json={
                "error_summary": "NullPointerException",
                "error_details": "Stacktrace...",
                "file_path": "main.py",
                "line_number": 10,
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("jira_issue", response.json())


if __name__ == "__main__":
    unittest.main()
