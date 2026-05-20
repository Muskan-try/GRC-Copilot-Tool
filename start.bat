@echo off
chcp 65001 >nul
echo ==========================================
echo   GRC Copilot — Full Tool Launcher (Windows)
echo ==========================================
echo.

REM Check if databases are running
docker ps | findstr grc_postgres >nul
if errorlevel 1 (
    echo Starting databases with Docker...
    docker-compose up -d postgres mongodb
    echo Databases started!
    echo Waiting 5 seconds for databases to be ready...
    timeout /t 5 /nobreak >nul
)

REM Start Node Gateway in new window
echo Starting Node Gateway (port 3000)...
start "Node Gateway" cmd /k "cd backend\node-gateway && npm start"

REM Start FastAPI Engine in new window
echo Starting FastAPI Engine (port 8000)...
start "FastAPI Engine" cmd /k "cd backend\fastapi-engine && venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM Start Frontend in new window
echo Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==========================================
echo   All services are starting!
echo ==========================================
echo.
echo   Frontend:    http://localhost:5173
echo   Backend API: http://localhost:3000
echo   FastAPI:     http://localhost:8000
echo   PostgreSQL:  localhost:5432
echo   MongoDB:     localhost:27017
echo.
echo Close the terminal windows to stop services.
echo.
pause
