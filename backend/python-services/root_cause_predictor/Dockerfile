FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
WORKDIR /app/root_cause_predictor
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"] 