#!/bin/bash
# Start all services (backend and frontend) using Docker Compose in the foreground

echo "Building and starting all services..."
docker-compose up --build 