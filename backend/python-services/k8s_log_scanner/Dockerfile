FROM python:3.10-slim

# Install kubectl, AWS CLI v1, and dependencies for GKE auth plugin
RUN apt-get update && apt-get install -y \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    awscli \
    tar \
    unzip \
    && curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install gcloud CLI and gke-gcloud-auth-plugin
RUN curl -LO https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-456.0.0-linux-x86_64.tar.gz \
    && tar -xf google-cloud-cli-456.0.0-linux-x86_64.tar.gz \
    && ./google-cloud-sdk/install.sh --quiet \
    && ./google-cloud-sdk/bin/gcloud components install gke-gcloud-auth-plugin --quiet \
    && mv ./google-cloud-sdk/bin/gke-gcloud-auth-plugin /usr/local/bin/ \
    && mv ./google-cloud-sdk/bin/gcloud /usr/local/bin/ \
    && rm -rf google-cloud-cli-456.0.0-linux-x86_64.tar.gz google-cloud-sdk

WORKDIR /app

# Copy requirements and install Python dependencies
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Run the service
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"] 