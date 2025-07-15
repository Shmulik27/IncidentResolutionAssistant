#!/bin/bash
set -e

# Always start from project root
topdir=$(pwd)

# Go Backend
cd backend/go-backend

echo "===== Go Backend: Lint ====="
export PATH="$PATH:$(go env GOPATH)/bin"
if ! command -v golangci-lint &> /dev/null; then
  echo "Installing golangci-lint..."
  go install github.com/golangci/golangci-lint/cmd/golangci-lint@v1.54.2
fi
golangci-lint run ./...

echo "===== Go Backend: Test ====="
go test ./...

echo "===== Go Backend: Docker Build ====="
docker build -t local/go-backend:localtest .

cd "$topdir"

# Python Services
cd backend/python-services
declare -a services=(log_analyzer action_recommender knowledge_base root_cause_predictor incident_integrator k8s_log_scanner)

for svc in "${services[@]}"; do
  echo "===== Python Service: $svc: Lint ====="
  cd $svc
  pip install --quiet --upgrade ruff pytest
  ruff .

  echo "===== Python Service: $svc: Test ====="
  pytest

  echo "===== Python Service: $svc: Docker Build ====="
  docker build -t local/$svc:localtest .
  cd ..
done

cd "$topdir"

echo "===== Helm Chart: Dry Run Template ====="
if command -v helm &> /dev/null; then
  helm template ira charts/incident-resolution-assistant
else
  echo "Helm not installed. Skipping Helm dry run."
fi

echo "===== CI LOCAL RUN COMPLETE =====" 