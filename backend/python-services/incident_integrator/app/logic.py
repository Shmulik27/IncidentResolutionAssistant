"""
Logic for the Incident Integrator Service.
Handles configuration, Jira/GitHub integration, Slack notifications, and webhooks.
"""

import json
import os
import hmac
import hashlib
import logging
from github import Github
from jira import JIRA
from dotenv import load_dotenv
import requests
from typing import Any

load_dotenv()

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
DEFAULT_CONFIG = {
    "GITHUB_TOKEN": "",
    "GITHUB_REPO": "",
    "JIRA_SERVER": "",
    "JIRA_USER": "",
    "JIRA_TOKEN": "",
    "JIRA_PROJECT": "",
    "WEBHOOK_SECRET": "",
    "SLACK_WEBHOOK_URL": "",
    "log_analyzer_url": "",
    "root_cause_predictor_url": "",
    "knowledge_base_url": "",
    "action_recommender_url": "",
    "incident_integrator_url": "",
    "enable_auto_analysis": True,
    "enable_jira_integration": True,
    "enable_github_integration": True,
    "enable_notifications": True,
    "request_timeout": 30,
    "max_retries": 3,
    "log_level": "INFO",
    "cache_ttl": 60,
}

__all__ = [
    "load_config",
    "save_config",
    "handle_incident_logic",
    "send_slack_notification",
    "get_github_repo",
    "get_jira_client",
    "verify_signature",
    "github_webhook_logic",
]


def load_config() -> dict[str, Any]:
    """
    Load the service configuration from file, creating it with defaults if missing.
    """
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(config: dict[str, Any]) -> None:
    """
    Save the provided configuration dictionary to file.
    """
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def find_existing_jira(summary: str, jira_client: Any, jira_project: str) -> Any:
    """
    Search for an existing Jira issue matching the summary in the given project.
    """
    jql = f'project={jira_project} AND summary~"{summary}" AND statusCategory != Done'
    issues = jira_client.search_issues(jql)
    if issues and isinstance(issues, list):
        return issues[0]
    return None


def send_slack_notification(message: str) -> None:
    """
    Send a notification to Slack using the configured webhook URL.
    """
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
    if not SLACK_WEBHOOK_URL:
        logging.warning("SLACK_WEBHOOK_URL not set, skipping Slack notification.")
        return
    try:
        resp = requests.post(SLACK_WEBHOOK_URL, json={"text": message}, timeout=10)
        if resp.status_code != 200:
            logging.error(f"Slack notification failed: {resp.text}")
    except Exception as e:
        logging.error(f"Slack notification error: {e}")


def handle_incident_logic(
    event: Any,
    get_code_owner: Any,
    get_codeowner_from_file: Any,
    repo: Any,
    jira: Any,
    jira_project: str,
) -> dict[str, Any]:
    """
    Handle a new incident event: create a Jira issue, assign it, and notify Slack.
    """
    existing = find_existing_jira(event.error_summary, jira, jira_project)
    if existing:
        logging.info(f"Existing Jira found: {existing.key}")
        return {"jira_issue": existing.key, "status": "already exists"}
    developer = get_code_owner(repo, event.file_path, event.line_number)
    if not developer:
        developer = get_codeowner_from_file(repo, event.file_path)
    if not developer:
        developer = repo.owner.login
    issue_dict = {
        "project": {"key": jira_project},
        "summary": f"Incident: {event.error_summary}",
        "description": event.error_details,
        "issuetype": {"name": "Bug"},
    }
    issue = jira.create_issue(fields=issue_dict)
    try:
        jira.assign_issue(issue, developer)
    except Exception as e:
        logging.warning(f"Could not assign Jira to {developer}: {e}")
    logging.info(f"Created Jira {issue.key} for {developer}")
    send_slack_notification(
        f":rotating_light: New Incident Created: {event.error_summary}\nAssigned to: {developer}\nJira: {issue.key}"
    )
    return {"jira_issue": issue.key, "assigned_to": developer}


def verify_signature(request_body: bytes, secret: str, signature: str) -> bool:
    """
    Verify the HMAC signature of a webhook request.
    """
    mac = hmac.new(secret.encode(), msg=request_body, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)


def github_webhook_logic(
    payload: dict[str, Any], webhook_secret: str, signature: str, jira_client: Any
) -> dict[str, str]:
    """
    Handle GitHub webhook events, closing Jira tickets when PRs are merged.
    """
    import re

    if not signature or not webhook_secret:
        raise ValueError("Missing signature or webhook secret")
    # PR merge referencing a Jira ticket
    if payload.get("action") == "closed" and payload.get("pull_request", {}).get(
        "merged"
    ):
        pr = payload["pull_request"]
        matches = re.findall(r"([A-Z]+-\d+)", pr["title"] + pr.get("body", ""))
        for ticket in matches:
            try:
                jira_client.transition_issue(ticket, "Done")
                logging.info(f"Closed Jira {ticket} due to PR merge")
                send_slack_notification(
                    f":white_check_mark: Incident Resolved: {ticket}\nClosed by PR: {pr['html_url']}"
                )
            except Exception as e:
                logging.error(f"Failed to close Jira ticket {ticket}: {e}")
    return {"status": "ok"}


def get_github_repo(github_token: str, github_repo: str) -> Any:
    """
    Get a GitHub repository object using the provided token and repo name.
    """
    if not github_token:
        raise ValueError("GITHUB_TOKEN environment variable is not set")
    if not github_repo:
        raise ValueError("GITHUB_REPO environment variable is not set")
    github = Github(github_token)
    return github.get_repo(github_repo)


def get_jira_client(jira_server: str, jira_user: str, jira_token: str) -> Any:
    """
    Get a Jira client object using the provided server, user, and token.
    """
    if not jira_server:
        raise ValueError("JIRA_SERVER environment variable is not set")
    if not jira_user:
        raise ValueError("JIRA_USER environment variable is not set")
    if not jira_token:
        raise ValueError("JIRA_TOKEN environment variable is not set")
    return JIRA(server=jira_server, basic_auth=(jira_user, jira_token))
