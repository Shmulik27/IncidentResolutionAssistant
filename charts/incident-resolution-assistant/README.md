# Incident Resolution Assistant Helm Chart

This Helm chart deploys the Incident Resolution Assistant application, including the Go backend and all Python microservices, on Kubernetes.

## Features
- Deploys Go backend and all Python services as separate Deployments and Services
- Configurable Ingress, ConfigMap, Secret, and PersistentVolumeClaims
- Docker image/tag configuration for each service

## Prerequisites
- Kubernetes cluster (v1.19+ recommended)
- Helm 3.x
- Docker images for all services pushed to DockerHub (update `values.yaml` with your DockerHub username and image tags)

## Installation

```sh
helm install ira charts/incident-resolution-assistant \
  --set goBackend.image.tag=<your-tag> \
  --set pythonServices.logAnalyzer.image.tag=<your-tag> \
  --set pythonServices.actionRecommender.image.tag=<your-tag> \
  --set pythonServices.knowledgeBase.image.tag=<your-tag> \
  --set pythonServices.rootCausePredictor.image.tag=<your-tag> \
  --set pythonServices.incidentIntegrator.image.tag=<your-tag> \
  --set pythonServices.k8sLogScanner.image.tag=<your-tag>
```

## Configuration

See `values.yaml` for all configurable options. Key sections:
- `goBackend`: Image, env, resources, replicaCount
- `pythonServices`: Each service's image, env, resources, replicaCount
- `config`: ConfigMap data
- `secret`: Secret data (base64 encoded automatically)
- `persistence`: Enable/disable PVCs, size, accessMode
- `ingress`: Enable/disable, host, paths, TLS

## Example: Enable Persistence

```yaml
persistence:
  enabled: true
  size: 5Gi
  accessMode: ReadWriteOnce
```

## Example: Set Environment Variables

```yaml
goBackend:
  env:
    LOG_LEVEL: debug
pythonServices:
  logAnalyzer:
    env:
      API_KEY: myapikey
```

## Upgrade

```sh
helm upgrade ira charts/incident-resolution-assistant -f my-values.yaml
```

## Uninstall

```sh
helm uninstall ira
```

## Notes
- Update `values.yaml` with your DockerHub username and image tags.
- Ingress defaults to NGINX and exposes the Go backend. Adjust as needed for your environment.
- PVCs are optional and disabled by default. 