from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import uvicorn
import sys
import os
from app.routers import auth
from app.core.database import connect_mongo, connect_postgres, close_connections
from app.routers import analysis, health, compliance_agent

# ─── Logger setup ─────────────────────────────────────────────────────────
logger.remove()
logger.add(sys.stdout, format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{line} - {message}", level="INFO")
logger.add("logs/fastapi.log", rotation="10 MB", retention="7 days", level="DEBUG")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GRC Copilot Analysis Engine...")
    await connect_mongo()
    await connect_postgres()
    os.makedirs(os.getenv("REPORT_OUTPUT_DIR", "./reports"), exist_ok=True)
    logger.info("Analysis engine ready")
    yield
    logger.info("Shutting down analysis engine...")
    await close_connections()

app = FastAPI(
    title="GRC Copilot Analysis Engine",
    description="FastAPI service for risk analysis, gap analysis, controls mapping, and report generation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Internal-Service"],
)

# ─── Internal auth middleware ─────────────────────────────────────────────
@app.middleware("http")
async def internal_auth(request: Request, call_next):
    if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
        return await call_next(request)
    service_key = request.headers.get("X-Internal-Service")
    expected = os.getenv("INTERNAL_SERVICE_KEY", "grc-gateway")
    if service_key != expected:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "Internal service key required"})
    return await call_next(request)

app.include_router(health.router)
app.include_router(analysis.router, prefix="/analysis")
app.include_router(compliance_agent.router, prefix="/agent/compliance")
app.include_router(auth.router, prefix="/auth")
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True, log_level="info")
