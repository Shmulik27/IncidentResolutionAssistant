FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m spacy download en_core_web_sm
COPY app/ ./app/
WORKDIR /app/log_analyzer
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]