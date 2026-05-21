from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional, List, Dict
from loguru import logger
import uuid
import hashlib

from app.modules.compliance_agent.agent import agent

router = APIRouter()

# In-memory store for reports (for demo purposes)
reports_db: Dict[str, Dict] = {}
# Content-hash → report cache: same file always returns the same result
content_hash_cache: Dict[str, Dict] = {}

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
        content_hash = hashlib.sha256(content).hexdigest()

        # Return cached result if the exact same file was already processed
        if content_hash in content_hash_cache:
            cached = content_hash_cache[content_hash]
            logger.info(f"Cache hit for {file.filename} (hash: {content_hash[:12]}...)")
            cached["cached"] = True
            return cached

        report = await agent.run_assessment(content, file.filename)
        
        # Save report to "database"
        report_id = str(uuid.uuid4())
        reports_db[report_id] = report

        result = {
            "report_id": report_id,
            "cached": False,
            **report
        }

        # Cache by content hash for deterministic results on re-upload
        content_hash_cache[content_hash] = result
        
        return result
    except Exception as e:
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed to process policy: {str(e)}")

@router.get("/report/{report_id}")
async def get_report(report_id: str):
    """Returns a structured report by ID."""
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="Report not found")
    return reports_db[report_id]
