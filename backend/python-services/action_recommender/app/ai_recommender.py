"""
AI-powered action recommender using transformer models.
"""

import logging
from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from transformers import pipeline
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("action_recommender")


class ActionRecommender:
    def __init__(self) -> None:
        # Load models
        self.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        self.generator = pipeline(
            "text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        )

        # Initialize action knowledge base
        self.action_knowledge = self._initialize_action_knowledge()

    def _initialize_action_knowledge(self) -> Dict[str, List[str]]:
        """Initialize knowledge base with common actions for different scenarios."""
        return {
            "memory_exhaustion": [
                "Increase container memory limit",
                "Enable memory monitoring",
                "Check for memory leaks",
                "Implement memory caching",
                "Scale up the service",
            ],
            "disk_full": [
                "Clean up temporary files",
                "Increase disk space",
                "Implement log rotation",
                "Archive old data",
                "Monitor disk usage",
            ],
            "network_failure": [
                "Check network connectivity",
                "Verify DNS settings",
                "Review firewall rules",
                "Test load balancer",
                "Check service endpoints",
            ],
            "cpu_overload": [
                "Scale horizontally",
                "Optimize resource usage",
                "Enable auto-scaling",
                "Profile CPU usage",
                "Review performance bottlenecks",
            ],
            "configuration_error": [
                "Validate config files",
                "Check environment variables",
                "Review service settings",
                "Update configuration",
                "Rollback recent changes",
            ],
        }

    def recommend_actions(
        self, incident_description: str, root_cause: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate action recommendations using AI models.
        """
        try:
            # Get embeddings for the incident
            incident_embedding = self.embedding_model.encode([incident_description])[0]

            # Get relevant actions from knowledge base
            relevant_actions = []
            if root_cause and root_cause in self.action_knowledge:
                # If we know the root cause, prioritize those actions
                relevant_actions.extend(self.action_knowledge[root_cause])

            # Generate dynamic recommendations using language model
            prompt = f"""Given this incident: '{incident_description}'
            What are the most important actions to resolve it? List 3 specific steps."""

            generated = self.generator(
                prompt, max_length=200, num_return_sequences=1, temperature=0.7
            )[0]["generated_text"]

            # Extract actions from generation (simple line splitting for this example)
            generated_actions = [
                line.strip()
                for line in generated.split("\n")
                if line.strip() and not line.strip().startswith("Given")
            ]

            # Combine knowledge base and generated actions
            all_actions = relevant_actions + generated_actions

            # Calculate relevance scores
            action_embeddings = self.embedding_model.encode(all_actions)
            relevance_scores = cosine_similarity(
                [incident_embedding], action_embeddings
            )[0]

            # Sort by relevance and format results
            sorted_actions = sorted(
                zip(all_actions, relevance_scores), key=lambda x: x[1], reverse=True
            )

            # Return top 5 unique actions with confidence scores
            seen: set[str] = set()
            recommendations: List[Dict[str, Any]] = []
            for action, score in sorted_actions:
                if action not in seen and len(recommendations) < 5:
                    seen.add(action)
                    recommendations.append(
                        {"action": action, "confidence": float(score)}
                    )

            return recommendations

        except Exception as e:
            logger.error(f"Error in action recommendation: {str(e)}")
            return [{"action": "Unable to generate recommendations", "confidence": 0.0}]


recommender = ActionRecommender()
