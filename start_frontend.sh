#!/bin/bash

# Start Frontend Development Server
echo "🚀 Starting Incident Resolution Assistant Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if backend services are running
echo "🔍 Checking backend services..."
services=("http://localhost:8080" "http://localhost:8001" "http://localhost:8002" "http://localhost:8003" "http://localhost:8004" "http://localhost:8005")

for service in "${services[@]}"; do
    if curl -s "$service/health" > /dev/null; then
        echo "✅ $service is running"
    else
        echo "⚠️  $service is not responding (make sure to run 'docker-compose up' first)"
    fi
done

echo ""
echo "🌐 Starting development server..."
echo "📱 Dashboard will be available at: http://localhost:3000"
echo "🔧 Backend API will be available at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
npm start 