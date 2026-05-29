from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/")
async def root():
    return {
        "service": "GRC Copilot Analysis Engine",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "redoc": "/redoc",
            "analysis": "/analysis/generate-report",
            "compliance_agent": "/agent/compliance/run",
        },
    }


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "grc-analysis-engine",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }
