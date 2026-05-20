#!/bin/bash
set -e

echo "=========================================="
echo "  GRC Copilot — Full Tool Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 20+ first.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}Node.js version $NODE_VERSION detected. Please upgrade to Node.js 20+.${NC}"
    exit 1
fi

echo -e "${GREEN}All prerequisites met!${NC}"
echo ""

# Create environment files if they don't exist
if [ ! -f backend/node-gateway/.env ]; then
    echo -e "${YELLOW}Creating backend environment file...${NC}"
    cp backend/node-gateway/.env.example backend/node-gateway/.env 2>/dev/null || cat > backend/node-gateway/.env << 'EOF'
NODE_ENV=development
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=grc_copilot
POSTGRES_USER=grc_user
POSTGRES_PASSWORD=grc_secure_password_2025
MONGO_URI=mongodb://localhost:27017/grc_copilot
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
MAX_FILE_SIZE_MB=10
UPLOAD_DIR=./uploads
FASTAPI_URL=http://localhost:8000
EOF
    echo -e "${GREEN}Created backend/node-gateway/.env${NC}"
fi

if [ ! -f backend/fastapi-engine/.env ]; then
    echo -e "${YELLOW}Creating FastAPI environment file...${NC}"
    cp backend/fastapi-engine/.env.example backend/fastapi-engine/.env 2>/dev/null || cat > backend/fastapi-engine/.env << 'EOF'
DATABASE_URL=postgresql://grc_user:grc_secure_password_2025@localhost:5432/grc_copilot
MONGO_URI=mongodb://localhost:27017/grc_copilot
EOF
    echo -e "${GREEN}Created backend/fastapi-engine/.env${NC}"
fi

echo ""

# Install backend dependencies
echo -e "${YELLOW}Installing backend (Node Gateway) dependencies...${NC}"
cd backend/node-gateway
npm install
cd ../..

echo -e "${GREEN}Backend dependencies installed!${NC}"
echo ""

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

echo -e "${GREEN}Frontend dependencies installed!${NC}"
echo ""

# Setup Python virtual environment for FastAPI
echo -e "${YELLOW}Setting up Python virtual environment for FastAPI...${NC}"
cd backend/fastapi-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..

echo -e "${GREEN}FastAPI dependencies installed!${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start databases:    docker-compose up -d postgres mongodb"
echo "  2. Start backend:      ./start.sh"
echo "  3. Or use Docker:      docker-compose up -d"
echo ""
echo "Then open: http://localhost:5173"
echo ""
