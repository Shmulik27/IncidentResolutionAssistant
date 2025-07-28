"""Models for the Action Recommender service."""

from typing import List, Optional
from pydantic import BaseModel


class RecommendRequest(BaseModel):
    """Request model for action recommendation."""

    query: str
    root_cause: Optional[str] = None


class ActionRecommendation(BaseModel):
    """Model for a single action recommendation."""

    action: str
    confidence: float


class RecommendResponse(BaseModel):
    """Response model for action recommendation."""

    recommendations: List[ActionRecommendation]


__all__ = ["RecommendRequest", "RecommendResponse", "ActionRecommendation"]
