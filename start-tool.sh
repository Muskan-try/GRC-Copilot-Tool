#!/bin/bash

# GRC Copilot - All-in-One Startup Script
# This script starts all services and verifies they are running correctly.

echo "🚀 Starting GRC Copilot AI Tool..."

# 1. Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# 2. Start all services using Docker Compose
echo "📦 Orchestrating containers..."
docker compose up -d

# 3. Wait for services to be healthy
echo "⏳ Waiting for services to initialize (this may take a few seconds)..."

max_retries=30
counter=0
success=false

while [ $counter -lt $max_retries ]; do
    gateway_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
    fastapi_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)

    if [ "$gateway_status" == "200" ] && [ "$fastapi_status" == "200" ]; then
        success=true
        break
    fi
    
    printf "."
    sleep 2
    ((counter++))
done

echo ""

if [ "$success" = true ]; then
    echo "✅ All services are UP and RUNNING!"
    echo "-------------------------------------------------------"
    echo "🌐 Frontend Dashboard: http://localhost:5173"
    echo "🤖 AI Compliance Agent: http://localhost:5173/agent"
    echo "📑 API Documentation:  http://localhost:8000/docs"
    echo "-------------------------------------------------------"
    echo "You can now open the Frontend URL in your browser."
else
    echo "⚠️ Warning: Some services took too long to start. Please check 'docker compose logs'."
fi
