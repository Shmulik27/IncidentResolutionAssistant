from pydantic import BaseModel
from typing import List, Optional


class PredictRequest(BaseModel):
    logs: List[str]


class PredictResponse(BaseModel):
    root_cause: str
    confidence: float
    error: Optional[str] = None
