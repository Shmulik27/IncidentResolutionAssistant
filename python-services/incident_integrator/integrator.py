import os
import hmac
import hashlib
import logging
from fastapi import FastAPI, HTTPException, Request, Header
from pydantic import BaseModel
from github import Github
from jira import JIRA
from dotenv import load_dotenv
from utils import get_code_owner, get_codeowner_from_file

load_dotenv()

app = FastAPI(
    title="Incident Integrator Service",
    description="Creates Jira issues for detected incidents and closes them when a fix is merged in GitHub.",
    version="2.0.0"
)

# Config
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")
JIRA_SERVER = os.getenv("JIRA_SERVER")
JIRA_USER = os.getenv("JIRA_USER")
JIRA_TOKEN = os.getenv("JIRA_TOKEN")
JIRA_PROJECT = os.getenv("JIRA_PROJECT")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")

logging.basicConfig(level=logging.INFO)

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