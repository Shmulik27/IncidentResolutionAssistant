"""
Advanced AI-powered analysis for root cause prediction using transformer models.
"""

import logging
from typing import List, Tuple, Dict
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("root_cause_predictor")
REVISION = "main"  # Revision for model loading


class RootCauseAnalyzer:
    def __init__(self) -> None:
        # Load DistilBERT for classification
        self.tokenizer = AutoTokenizer.from_pretrained(
            "distilbert-base-uncased", revision=REVISION
        )  # nosec
        self.model = AutoModelForSequenceClassification.from_pretrained(
            "distilbert-base-uncased",
            revision=REVISION,
            num_labels=len(self.get_root_cause_labels()),
        )  # nosec

        # Load sentence transformer for semantic similarity
        self.sentence_model = SentenceTransformer("all-MiniLM-L6-v2", revision=REVISION)

        # Initialize knowledge base
        self.knowledge_base = self._initialize_knowledge_base()

    @staticmethod
    def get_root_cause_labels() -> List[str]:
        # Keep consistent with the display mapping in api.py
        return [
            "memory_exhaustion",  # Will be mapped to "Memory exhaustion" in API
            "disk_full",  # Will be mapped to "Disk full" in API
            "Service unavailable",
            "network_failure",  # Will be mapped to "Network failure" in API
            "Permission issue",  # Already in display format
            "unknown",  # Will be mapped to "Unknown or not enough data" in API
        ]

    def _initialize_knowledge_base(self) -> Dict[str, List[str]]:
        """Initialize knowledge base with example cases for each root cause."""
        return {
            "memory_exhaustion": [
                "Out of memory error in service",
                "Memory limit exceeded in pod",
                "OOMKilled event detected",
                "Failed to allocate memory",
                "Memory usage exceeded limit",
            ],
            "Service unavailable": [
                "connection refused by service",
                "service not responding",
                "service is down",
                "failed to connect to service",
                "service unreachable",
            ],
            "Permission issue": [
                "permission denied",
                "access forbidden",
                "insufficient privileges",
                "unauthorized access",
                "not allowed to access",
            ],
            "disk_full": [
                "disk space exhausted",
                "no space left on device",
                "disk quota exceeded",
                "filesystem is full",
            ],
            "network_failure": [
                "connection timed out",
                "request timeout",
                "network latency high",
                "connection lost",
            ],
            "unknown": [
                "unknown error",
                "unclear error message",
                "insufficient log data",
                "non-specific error",
            ],
        }

    def predict(self, log_message: str) -> Tuple[str, float]:
        """
        Predict root cause using ensemble of transformer model and semantic similarity.
        """
        try:
            # Get embeddings for input log
            log_embedding = self.sentence_model.encode([log_message])[0]

            # Calculate similarity with knowledge base
            similarities = {}
            for cause, examples in self.knowledge_base.items():
                example_embeddings = self.sentence_model.encode(examples)
                similarity = cosine_similarity(
                    [log_embedding], example_embeddings
                ).max()
                similarities[cause] = similarity

            # Get transformer model prediction
            inputs = self.tokenizer(
                log_message, return_tensors="pt", truncation=True, max_length=512
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)

            # Combine predictions (simple average)
            transformer_pred = self.get_root_cause_labels()[int(probs.argmax().item())]
            transformer_conf = probs.max().item()

            semantic_pred = max(similarities.items(), key=lambda x: x[1])[0]
            semantic_conf = max(similarities.values())

            # For unclear messages, force unknown
            if not any(
                key_term in log_message.lower()
                for key_term in [
                    "out of memory",
                    "memory limit",
                    "OOMKilled",
                    "disk full",
                    "space",
                    "quota",
                    "connection refused",
                    "service unavailable",
                    "timeout",
                    "permission denied",
                    "access forbidden",
                    "unauthorized",
                ]
            ):
                return "unknown", 0.0

            # Ensemble decision
            if transformer_conf > 0.8:  # High confidence from transformer
                return transformer_pred, transformer_conf
            elif semantic_conf > 0.8:  # High confidence from semantic similarity
                return semantic_pred, semantic_conf
            elif max(transformer_conf, semantic_conf) < 0.3:  # Very low confidence
                return "unknown", 0.0
            else:  # Take average of both confidences but favor semantic analysis for specific errors
                if "permission denied" in log_message.lower():
                    return "Permission issue", semantic_conf
                elif "connection refused" in log_message.lower():
                    return "Service unavailable", semantic_conf
                else:
                    final_pred = (
                        transformer_pred
                        if transformer_conf > semantic_conf
                        else semantic_pred
                    )
                    final_conf = max(transformer_conf, semantic_conf)
                    return final_pred, final_conf

        except Exception as e:
            logger.error(f"Error in AI prediction: {str(e)}")
            return "unknown", 0.0


# Create a single instance to be imported by other modules
analyzer = RootCauseAnalyzer()
