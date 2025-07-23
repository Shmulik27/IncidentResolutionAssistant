import numpy as np
from sklearn.ensemble import IsolationForest
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
import spacy
from typing import List

# Download NLTK resources
nltk.download("punkt")
nltk.download("stopwords")
nltk.download("wordnet")

# Initialize spaCy model
nlp = spacy.load("en_core_web_sm")

# Example log data
logs = [
    "Error: Disk space is critically low.",
    "Warning: High memory usage detected.",
    "Info: Backup completed successfully.",
]


# 1. Anomaly Detection with Isolation Forest
def detect_anomalies_isolation_forest(data: List[str]) -> List[int]:
    vectorized_data = np.array([len(log) for log in data]).reshape(-1, 1)
    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(vectorized_data)
    anomalies = model.predict(vectorized_data)
    return anomalies.tolist()


# 2. Statistical Anomaly Detection with Z-Scores
def detect_anomalies_zscore(data: List[str]) -> List[bool]:
    log_lengths = np.array([len(log) for log in data])
    z_scores = (log_lengths - np.mean(log_lengths)) / np.std(log_lengths)
    anomalies = np.abs(z_scores) > 2  # Threshold for anomaly
    return anomalies.tolist()


# 3. NLP Preprocessing with NLTK
def preprocess_logs_nltk(data: List[str]) -> List[str]:
    stop_words = set(stopwords.words("english"))
    lemmatizer = WordNetLemmatizer()
    processed_logs = []
    for log in data:
        tokens = word_tokenize(log.lower())
        filtered_tokens = [
            lemmatizer.lemmatize(word)
            for word in tokens
            if word.isalnum() and word not in stop_words
        ]
        processed_logs.append(" ".join(filtered_tokens))
    return processed_logs


# 4. NLP Preprocessing with spaCy
def preprocess_logs_spacy(data: List[str]) -> List[str]:
    processed_logs = []
    for log in data:
        doc = nlp(log.lower())
        tokens = [token.lemma_ for token in doc if token.is_alpha and not token.is_stop]
        processed_logs.append(" ".join(tokens))
    return processed_logs


# Example usage
if __name__ == "__main__":
    print("Original Logs:", logs)

    # Anomaly Detection
    print("Anomalies (Isolation Forest):", detect_anomalies_isolation_forest(logs))
    print("Anomalies (Z-Score):", detect_anomalies_zscore(logs))

    # NLP Preprocessing
    print("Preprocessed Logs (NLTK):", preprocess_logs_nltk(logs))
    print("Preprocessed Logs (spaCy):", preprocess_logs_spacy(logs))
