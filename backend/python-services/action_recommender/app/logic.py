"""
Logic for the Action Recommender service.
Provides action recommendations based on incident queries using AI.
"""

import logging
from typing import Any, List, Dict
from app.models import RecommendRequest
from .ai_recommender import recommender

logger = logging.getLogger("action_recommender.logic")


def recommend_action_logic(request: RecommendRequest) -> List[Dict[str, Any]]:
    """
    Recommend actions based on the request query using AI.
    Returns a list of recommended actions with confidence scores.
    """
    try:
        # Get AI-powered recommendations
        recommendations = recommender.recommend_actions(
            incident_description=request.query,
            root_cause=request.root_cause if hasattr(request, "root_cause") else None,
        )

        return recommendations

    except Exception as e:
        logger.error(f"Error in recommendation: {str(e)}")
        return [{"action": "Unable to generate recommendations", "confidence": 0.0}]


__all__ = ["recommend_action_logic"]
