@echo off
chcp 65001 >nul
echo ==========================================
echo   GRC Copilot — Full Tool Setup (Windows)
echo ==========================================
echo.

REM Check prerequisites
echo Checking prerequisites...

node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js 20+ first.
    exit /b 1
)

docker -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker Desktop first.
    exit /b 1
)

echo All prerequisites met!
echo.

REM Create environment files if they don't exist
if not exist backend\node-gateway\.env (
    echo Creating backend environment file...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo POSTGRES_HOST=localhost
        echo POSTGRES_PORT=5432
        echo POSTGRES_DB=grc_copilot
        echo POSTGRES_USER=grc_user
        echo POSTGRES_PASSWORD=grc_secure_password_2025
        echo MONGO_URI=mongodb://localhost:27017/grc_copilot
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo CORS_ORIGIN=http://localhost:5173
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX=100
        echo MAX_FILE_SIZE_MB=10
        echo UPLOAD_DIR=.\uploads
        echo FASTAPI_URL=http://localhost:8000
    ) > backend\node-gateway\.env
    echo Created backend\node-gateway\.env
)

if not exist backend\fastapi-engine\.env (
    echo Creating FastAPI environment file...
    (
        echo DATABASE_URL=postgresql://grc_user:grc_secure_password_2025@localhost:5432/grc_copilot
        echo MONGO_URI=mongodb://localhost:27017/grc_copilot
    ) > backend\fastapi-engine\.env
    echo Created backend\fastapi-engine\.env
)

echo.

REM Install backend dependencies
echo Installing backend (Node Gateway) dependencies...
cd backend\node-gateway
call npm install
cd ..\..

echo Backend dependencies installed!
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo Frontend dependencies installed!
echo.

REM Setup Python virtual environment for FastAPI
echo Setting up Python virtual environment for FastAPI...
cd backend\fastapi-engine
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..\..

echo FastAPI dependencies installed!
echo.

echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo   1. Start databases:    docker-compose up -d postgres mongodb
echo   2. Start backend:      start.bat
echo   3. Or use Docker:      docker-compose up -d
echo.
echo Then open: http://localhost:5173
echo.
pause
