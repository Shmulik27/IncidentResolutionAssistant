FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY knowledge_base/ ./knowledge_base/
WORKDIR /app/knowledge_base
CMD ["uvicorn", "vector_search:app", "--host", "0.0.0.0", "--port", "8000"] 