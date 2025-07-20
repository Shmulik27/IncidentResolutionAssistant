import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Header, Body
from common.fastapi_utils import add_cors, setup_logging
from app.logic import load_config, save_config, handle_incident_logic, send_slack_notification, get_github_repo, get_jira_client, verify_signature, github_webhook_logic
from app.models import IncidentEvent

load_dotenv()

app = FastAPI(
    title="Incident Integrator Service",
    description="Creates Jira issues for detected incidents and closes them when a fix is merged in GitHub.",
    version="2.0.0"
)
add_cors(app)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO")
JIRA_SERVER = os.getenv("JIRA_SERVER")
JIRA_USER = os.getenv("JIRA_USER")
JIRA_TOKEN = os.getenv("JIRA_TOKEN")
JIRA_PROJECT = os.getenv("JIRA_PROJECT")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")

logger = setup_logging("incident_integrator")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/config")
def get_config():
    config = load_config()
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

@app.post("/incident")
def handle_incident(event: IncidentEvent):
    repo = get_github_repo(GITHUB_TOKEN, GITHUB_REPO)
    jira = get_jira_client(JIRA_SERVER, JIRA_USER, JIRA_TOKEN)
    from app.utils import get_code_owner, get_codeowner_from_file
    return handle_incident_logic(event, get_code_owner, get_codeowner_from_file, repo, jira, JIRA_PROJECT)

@app.post("/github-webhook")
async def github_webhook(request: Request, x_hub_signature_256: str = Header(None)):
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
    body = await request.body()
    if not x_hub_signature_256 or not verify_signature(body, str(WEBHOOK_SECRET), x_hub_signature_256):
        raise HTTPException(status_code=403, detail="Invalid signature")
    payload = await request.json()
    jira = get_jira_client(JIRA_SERVER, JIRA_USER, JIRA_TOKEN)
    return github_webhook_logic(payload, str(WEBHOOK_SECRET), x_hub_signature_256, jira) 