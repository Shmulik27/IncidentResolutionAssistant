import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Header, Body
from common.fastapi_utils import add_cors, setup_logging
from app.logic import load_config, save_config, handle_incident_logic, get_github_repo, get_jira_client, verify_signature, github_webhook_logic
from app.models import IncidentEvent
from typing import Any

load_dotenv()

app = FastAPI(
    title="Incident Integrator Service",
    description="Creates Jira issues for detected incidents and closes them when a fix is merged in GitHub.",
    version="2.0.0"
)
add_cors(app)

GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN") or ""
GITHUB_REPO: str = os.getenv("GITHUB_REPO") or ""
JIRA_SERVER: str = os.getenv("JIRA_SERVER") or ""
JIRA_USER: str = os.getenv("JIRA_USER") or ""
JIRA_TOKEN: str = os.getenv("JIRA_TOKEN") or ""
JIRA_PROJECT: str = os.getenv("JIRA_PROJECT") or ""
WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET") or ""

logger = setup_logging("incident_integrator")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/config")
def get_config() -> dict[str, Any]:
    config = load_config()
    masked = {}
    for k, v in config.items():
        if any(s in k for s in ["TOKEN", "SECRET", "WEBHOOK"]):
            masked[k] = "****" if v else ""
        else:
            masked[k] = v
    return masked

@app.post("/config")
def update_config(new_config: dict = Body(...)) -> dict[str, Any]:
    config = load_config()
    config.update(new_config)
    save_config(config)
    return {"status": "ok", "config": config}

@app.post("/incident")
def handle_incident(event: IncidentEvent) -> dict[str, Any]:
    repo = get_github_repo(GITHUB_TOKEN, GITHUB_REPO)
    jira = get_jira_client(JIRA_SERVER, JIRA_USER, JIRA_TOKEN)
    from app.utils import get_code_owner, get_codeowner_from_file
    return handle_incident_logic(event, get_code_owner, get_codeowner_from_file, repo, jira, JIRA_PROJECT)

@app.post("/github-webhook")
async def github_webhook(request: Request, x_hub_signature_256: str = Header(None)) -> dict[str, Any]:
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")
    body = await request.body()
    if not x_hub_signature_256 or not verify_signature(body, str(WEBHOOK_SECRET), x_hub_signature_256):
        raise HTTPException(status_code=403, detail="Invalid signature")
    payload = await request.json()
    jira = get_jira_client(JIRA_SERVER, JIRA_USER, JIRA_TOKEN)
    return github_webhook_logic(payload, str(WEBHOOK_SECRET), x_hub_signature_256, jira) 