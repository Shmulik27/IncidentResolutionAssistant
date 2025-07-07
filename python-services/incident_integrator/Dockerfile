FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY incident_integrator/ ./incident_integrator/
WORKDIR /app/incident_integrator
CMD ["uvicorn", "integrator:app", "--host", "0.0.0.0", "--port", "8000"] 