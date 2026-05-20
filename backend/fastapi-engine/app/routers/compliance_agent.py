from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional, List, Dict
from loguru import logger
import uuid

from app.modules.compliance_agent.agent import agent

router = APIRouter()

# In-memory store for reports (for demo purposes)
reports_db: Dict[str, Dict] = {}

@router.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...)):
    """Accepts uploaded policy documents."""
    try:
        content = await file.read()
        # In a real app, we would save this to a temporary storage or process it immediately.
        # For now, we'll return a success message.
        return {
            "filename": file.filename,
            "size": len(content),
            "status": "uploaded",
            "message": "Policy uploaded successfully. You can now run the compliance mapping agent."
        }
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload policy: {str(e)}")

@router.post("/run")
async def run_agent(file: UploadFile = File(...)):
    """Runs the Compliance Mapping Agent on the uploaded policy."""
    try:
        content = await file.read()
        report = await agent.run_assessment(content, file.filename)
        
        # Save report to "database"
        report_id = str(uuid.uuid4())
        reports_db[report_id] = report
        
        return {
            "report_id": report_id,
            **report
        }
    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed to process policy: {str(e)}")

@router.get("/report/{report_id}")
async def get_report(report_id: str):
    """Returns a structured report by ID."""
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="Report not found")
    return reports_db[report_id]
