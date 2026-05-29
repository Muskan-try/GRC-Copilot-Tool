#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "  GRC Copilot — Full Tool Launcher"
echo "=========================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID $FASTAPI_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Check if databases are running
if ! docker ps | grep -q grc_postgres; then
    echo -e "${YELLOW}Starting databases with Docker...${NC}"
    docker-compose up -d postgres mongodb
    echo -e "${GREEN}Databases started!${NC}"
    echo "Waiting 5 seconds for databases to be ready..."
    sleep 5
fi

# Start Node Gateway
echo -e "${YELLOW}Starting Node Gateway (port 3000)...${NC}"
cd backend/node-gateway
npm start &
BACKEND_PID=$!
cd ../..

# Start FastAPI Engine
echo -e "${YELLOW}Starting FastAPI Engine (port 8000)...${NC}"
cd backend/fastapi-engine
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
FASTAPI_PID=$!
cd ../..

# Start Frontend
echo -e "${YELLOW}Starting Frontend (port 5173)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}=========================================="
echo "  All services are running!"
echo "==========================================${NC}"
echo ""
echo "  Frontend:    http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo "  FastAPI:     http://localhost:8000"
echo "  PostgreSQL:  localhost:5432"
echo "  MongoDB:     localhost:27017"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for all background processes
wait
