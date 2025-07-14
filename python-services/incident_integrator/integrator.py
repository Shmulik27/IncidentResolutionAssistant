import json
import os
import hmac
import hashlib
import logging
from fastapi import FastAPI, HTTPException, Request, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from github import Github
from jira import JIRA
from dotenv import load_dotenv
from incident_integrator.utils import get_code_owner, get_codeowner_from_file
import requests

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
    # Add your service URLs and feature flags here:
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
    "cache_ttl": 60
}

def load_config():
    if not os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "w") as f:
            json.dump(DEFAULT_CONFIG, f, indent=2)
    with open(CONFIG_PATH) as f:
        return json.load(f)

def save_config(config):
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)

app = FastAPI(
    title="Incident Integrator Service",
    description="Creates Jira issues for detected incidents and closes them when a fix is merged in GitHub.",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")
JIRA_SERVER = os.getenv("JIRA_SERVER")
JIRA_USER = os.getenv("JIRA_USER")
JIRA_TOKEN = os.getenv("JIRA_TOKEN")
JIRA_PROJECT = os.getenv("JIRA_PROJECT")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

logging.basicConfig(level=logging.INFO)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/config")
def get_config():
    config = load_config()
    # Mask secrets in GET
    masked = {}
    for k, v in config.items():
        if any(s in k for s in ["TOKEN", "SECRET", "WEBHOOK"]):
            masked[k] = "****" if v else ""
        else:
            masked[k] = v
    return masked

@app.post("/config")
def update_config(new_config: dict = Body(...)):
    config = load_config()
    config.update(new_config)
    save_config(config)
    return {"status": "ok", "config": config}

class IncidentEvent(BaseModel):
    error_summary: str
    error_details: str
    file_path: str
    line_number: int

def find_existing_jira(summary):
    jira = get_jira_client()
    jql = f'project={JIRA_PROJECT} AND summary~"{summary}" AND statusCategory != Done'
    issues = jira.search_issues(jql)
    if issues and isinstance(issues, list):
        return issues[0]
    return None

def send_slack_notification(message):
    SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")
    if not SLACK_WEBHOOK_URL:
        logging.warning("SLACK_WEBHOOK_URL not set, skipping Slack notification.")
        return
    try:
        resp = requests.post(SLACK_WEBHOOK_URL, json={"text": message})
        if resp.status_code != 200:
            logging.error(f"Slack notification failed: {resp.text}")
    except Exception as e:
        logging.error(f"Slack notification error: {e}")

@app.post("/incident")
def handle_incident(event: IncidentEvent):
    # 1. Check for existing open Jira
    existing = find_existing_jira(event.error_summary)
    if existing:
        logging.info(f"Existing Jira found: {existing.key}")
        return {"jira_issue": existing.key, "status": "already exists"}

    # 2. Find relevant developer
    repo = get_github_repo()
    jira = get_jira_client()
    developer = get_code_owner(repo, event.file_path, event.line_number)
    if not developer:
        developer = get_codeowner_from_file(repo, event.file_path)
    if not developer:
        developer = repo.owner.login  # fallback

    # 3. Create Jira issue
    issue_dict = {
        'project': {'key': JIRA_PROJECT},
        'summary': f"Incident: {event.error_summary}",
        'description': event.error_details,
        'issuetype': {'name': 'Bug'},
    }
    issue = jira.create_issue(fields=issue_dict)
    try:
        jira.assign_issue(issue, developer)
    except Exception as e:
        logging.warning(f"Could not assign Jira to {developer}: {e}")

    logging.info(f"Created Jira {issue.key} for {developer}")
    # Send Slack notification for new incident
    send_slack_notification(f":rotating_light: New Incident Created: {event.error_summary}\nAssigned to: {developer}\nJira: {issue.key}")
    return {"jira_issue": issue.key, "assigned_to": developer}

def verify_signature(request: Request, secret: str, signature: str):
    body = request._body
    mac = hmac.new(secret.encode(), msg=body, digestmod=hashlib.sha256)
    expected = "sha256=" + mac.hexdigest()
    return hmac.compare_digest(expected, signature)

@app.post("/github-webhook")
async def github_webhook(request: Request, x_hub_signature_256: str = Header(None)):
    # 1. Verify webhook secret
    body = await request.body()
    if not x_hub_signature_256 or not hmac.compare_digest(
        "sha256=" + hmac.new(str(WEBHOOK_SECRET).encode(), body, hashlib.sha256).hexdigest(),
        x_hub_signature_256
    ):
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    # 2. Detect PR merge referencing a Jira ticket
    if payload.get("action") == "closed" and payload.get("pull_request", {}).get("merged"):
        pr = payload["pull_request"]
        import re
        matches = re.findall(r'([A-Z]+-\d+)', pr["title"] + pr.get("body", ""))
        jira = get_jira_client()
        for ticket in matches:
            try:
                jira.transition_issue(ticket, "Done")  # Use correct transition name/id
                logging.info(f"Closed Jira {ticket} due to PR merge")
                # Send Slack notification for incident resolved
                send_slack_notification(f":white_check_mark: Incident Resolved: {ticket}\nClosed by PR: {pr['html_url']}")
            except Exception as e:
                logging.error(f"Failed to close Jira ticket {ticket}: {e}")
    return {"status": "ok"}

def get_github_repo():
    if not GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN environment variable is not set")
    if not GITHUB_REPO:
        raise ValueError("GITHUB_REPO environment variable is not set")
    github = Github(GITHUB_TOKEN)
    return github.get_repo(GITHUB_REPO)

def get_jira_client():
    if not JIRA_SERVER:
        raise ValueError("JIRA_SERVER environment variable is not set")
    if not JIRA_USER:
        raise ValueError("JIRA_USER environment variable is not set")
    if not JIRA_TOKEN:
        raise ValueError("JIRA_TOKEN environment variable is not set")
    return JIRA(server=JIRA_SERVER, basic_auth=(JIRA_USER, JIRA_TOKEN)) 