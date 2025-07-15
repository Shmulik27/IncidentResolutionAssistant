FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY root_cause_predictor/ ./root_cause_predictor/
WORKDIR /app/root_cause_predictor
CMD ["uvicorn", "predictor:app", "--host", "0.0.0.0", "--port", "8000"] 