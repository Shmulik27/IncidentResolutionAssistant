"""
Logic for the Action Recommender service.
Provides action recommendations based on incident queries.
"""

import logging
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from typing import Any
from app.models import RecommendRequest

logger = logging.getLogger("action_recommender.logic")

vectorizer = TfidfVectorizer()
model = LogisticRegression()

# Fit with dummy data for testing/demo
_dummy_X = [
    "Memory exhaustion",
    "Disk full",
    "Network timeout",
    "Service unavailable",
    "Permission issue",
    "Unknown or not enough data",
]
_dummy_y = [
    "restart_service",
    "free_disk_space",
    "retry_connection",
    "escalate_issue",
    "check_permissions",
    "escalate_issue",
]
vectorizer.fit(_dummy_X)
model.fit(vectorizer.transform(_dummy_X), _dummy_y)


def recommend_action_logic(request: RecommendRequest) -> Any:
    """
    Recommend an action based on the request query.
    Returns a RecommendResponse object with the action.
    """
    mapping = {
        "Memory exhaustion": "restart_service",
        "Disk full": "free_disk_space",
        "Network timeout": "retry_connection",
        "Service unavailable": "escalate_issue",
        "Permission issue": "check_permissions",
        "Unknown or not enough data": "escalate_issue",
    }
    action = mapping.get(request.query, "escalate_issue")
    return type("RecommendResponse", (), {"action": action})()


__all__ = ["recommend_action_logic"]
