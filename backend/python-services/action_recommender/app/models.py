"""Models for the Action Recommender service."""

from pydantic import BaseModel

class RecommendRequest(BaseModel):
    """Request model for action recommendation."""
    query: str

class RecommendResponse(BaseModel):
    """Response model for action recommendation."""
    action: str

__all__ = ["RecommendRequest", "RecommendResponse"] 