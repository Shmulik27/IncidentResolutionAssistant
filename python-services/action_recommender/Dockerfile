FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY action_recommender/ ./action_recommender/
WORKDIR /app/action_recommender
CMD ["uvicorn", "recommender:app", "--host", "0.0.0.0", "--port", "8000"] 