from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI()

class PredictRequest(BaseModel):
    logs: List[str]

@app.post("/predict")
def predict_root_cause(request: PredictRequest):
    # Simple rule-based prediction
    for line in request.logs:
        if "Out of memory" in line or "memory" in line.lower():
            return {"root_cause": "Memory exhaustion"}
        if "disk full" in line or "no space" in line.lower():
            return {"root_cause": "Disk full"}
        if "timeout" in line.lower():
            return {"root_cause": "Network timeout"}
        if "connection refused" in line.lower():
            return {"root_cause": "Service unavailable"}
        if "permission denied" in line.lower():
            return {"root_cause": "Permission issue"}
    return {"root_cause": "Unknown or not enough data"} 