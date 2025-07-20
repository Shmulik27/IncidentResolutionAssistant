"""Models for the Root Cause Predictor service."""

from typing import List
from pydantic import BaseModel

class PredictRequest(BaseModel):
    """Request model for root cause prediction."""
    log_lines: List[str] 