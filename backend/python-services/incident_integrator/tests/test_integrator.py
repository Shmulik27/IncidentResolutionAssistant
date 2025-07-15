import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from .integrator import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def set_slack_env(monkeypatch):
    monkeypatch.setenv('SLACK_WEBHOOK_URL', 'http://mock-slack-webhook')
    monkeypatch.setenv('JIRA_PROJECT', 'PROJ')
    monkeypatch.setenv('GITHUB_TOKEN', 'dummy')
    monkeypatch.setenv('GITHUB_REPO', 'dummy/repo')
    monkeypatch.setenv('JIRA_SERVER', 'http://dummy-jira')
    monkeypatch.setenv('JIRA_USER', 'dummy')
    monkeypatch.setenv('JIRA_TOKEN', 'dummy')

@patch('incident_integrator.integrator.requests.post')
@patch('incident_integrator.integrator.get_jira_client')
@patch('incident_integrator.integrator.get_github_repo')
def test_slack_notification_on_new_incident(mock_github, mock_jira, mock_post):
    # Mock Jira client
    mock_jira_instance = MagicMock()
    mock_jira.return_value = mock_jira_instance
    mock_jira_instance.search_issues.return_value = []
    mock_issue = MagicMock()
    mock_issue.key = 'PROJ-123'
    mock_jira_instance.create_issue.return_value = mock_issue
    mock_jira_instance.assign_issue.return_value = None
    # Mock Github repo
    mock_repo = MagicMock()
    mock_repo.owner.login = 'devuser'
    mock_github.return_value = mock_repo
    # Mock Slack
    mock_post.return_value.status_code = 200
    mock_post.return_value.text = 'ok'
    event = {
        "error_summary": "Test error",
        "error_details": "Something failed",
        "file_path": "src/app.py",
        "line_number": 42
    }
    response = client.post("/incident", json=event)
    assert response.status_code == 200
    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert args[0] == 'http://mock-slack-webhook'
    assert 'Test error' in kwargs['json']['text']
    assert 'devuser' in kwargs['json']['text']
    assert 'PROJ-123' in kwargs['json']['text']

@patch('incident_integrator.integrator.requests.post')
@patch('incident_integrator.integrator.get_jira_client')
def test_slack_notification_on_incident_resolved(mock_jira, mock_post):
    # Mock Jira client
    mock_jira_instance = MagicMock()
    mock_jira.return_value = mock_jira_instance
    mock_jira_instance.transition_issue.return_value = None
    # Mock Slack
    mock_post.return_value.status_code = 200
    mock_post.return_value.text = 'ok'
    payload = {
        "action": "closed",
        "pull_request": {
            "merged": True,
            "title": "Fixes JIRA-123",
            "body": "Closes JIRA-123",
            "html_url": "http://github/pr/1"
        }
    }
    headers = {"x-hub-signature-256": "sha256=validsig"}
    with patch('incident_integrator.integrator.hmac.compare_digest', return_value=True):
        response = client.post("/github-webhook", json=payload, headers=headers)
    assert response.status_code == 200
    assert mock_post.called
    args, kwargs = mock_post.call_args
    assert args[0] == 'http://mock-slack-webhook'
    assert 'Incident Resolved' in kwargs['json']['text']
    assert 'JIRA-123' in kwargs['json']['text']
    assert 'http://github/pr/1' in kwargs['json']['text'] 