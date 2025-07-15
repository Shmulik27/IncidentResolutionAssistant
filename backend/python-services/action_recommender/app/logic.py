from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import numpy as np
import logging

# Synthetic training data
root_causes = [
    "Memory exhaustion",
    "Disk full",
    "Network timeout",
    "Service unavailable",
    "Permission issue",
    "Unknown or not enough data"
]
actions = [
    "Restart service and increase memory",
    "Clean up disk and free space",
    "Check network and retry",
    "Check service status and escalate",
    "Fix file permissions",
    "Escalate to SRE team"
]

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(root_causes)
y = np.array(actions)
model = LogisticRegression(max_iter=1000)
model.fit(X, y)

logger = logging.getLogger("action_recommender.logic")

def recommend_action_logic(root_cause: str) -> str:
    if not root_cause:
        logger.info("No root_cause provided in request.")
        return "No action: root cause not provided"
    X_query = vectorizer.transform([root_cause])
    action = model.predict(X_query)[0]
    logger.info(f"Recommended action: {action}")
    return action 