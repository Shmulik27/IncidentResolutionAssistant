FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . /app/incident_integrator
WORKDIR /app/incident_integrator
ENV PYTHONPATH=/app
CMD ["uvicorn", "incident_integrator.integrator:app", "--host", "0.0.0.0", "--port", "8005"] 