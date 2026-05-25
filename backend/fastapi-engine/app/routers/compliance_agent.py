import os  
import uuid
import hashlib
import sys
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional, List, Dict
from loguru import logger
import asyncpg

from app.core.database import pg_pool

router = APIRouter()

# In-memory store for reports (for demo purposes)
reports_db: Dict[str, Dict] = {}
# Content-hash → report cache: same file always returns the same result
content_hash_cache: Dict[str, Dict] = {}

async def get_pg_conn():
    if not pg_pool:
        raise HTTPException(status_code=500, detail="PostgreSQL pool not initialized")
    async with pg_pool.acquire() as conn:
        yield conn

@router.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...)):
    """Accepts uploaded policy documents."""
    try:
        content = await file.read()
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
    """Runs our new Multi-Agent Vector Pipeline on the uploaded policy, preserving existing DB integration."""
    try:
        content = await file.read()
        content_hash = hashlib.sha256(content).hexdigest()

        # Keep your caching logic intact!
        if content_hash in content_hash_cache:
            cached = content_hash_cache[content_hash]
            logger.info(f"Cache hit for {file.filename} (hash: {content_hash[:12]}...)")
            cached["cached"] = True
            return cached

        # --- STEP 1: Stage file locally so our pipeline can parse it ---
        temp_storage_path = os.path.join(os.getcwd(), f"temp_upload_{file.filename}")
        with open(temp_storage_path, "wb") as buffer:
            buffer.write(content)

        # --- STEP 2: Execute our new Multi-Agent Pipeline ---
        from app.agents.pipeline import execute_grc_agent_pipeline
        mapping_payload, gap_report = execute_grc_agent_pipeline(temp_storage_path)

        # Clean up filesystem asset cleanly
        if os.path.exists(temp_storage_path):
            os.remove(temp_storage_path)

        # --- STEP 3: Format the output to fit your existing frontend schema expectations ---
        total_controls = gap_report.controls_found_count
        
        report = {
            "controls_found": [item.model_dump() for item in mapping_payload.final_mappings],
            "gaps_identified": gap_report.gaps_identified,
            "open_risks": gap_report.open_risks,
            "compliance_recommendations": gap_report.compliance_recommendations
        }

        # --- STEP 4: Keep your existing PostgreSQL telemetry tracking working ---
        compliance_score = None
        assessment_id = str(uuid.uuid4())
        report_id = str(uuid.uuid4())
        
        try:
            if pg_pool:
                async with pg_pool.acquire() as conn:
                    org_row = await conn.fetchrow("SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1")
                    org_id = org_row["id"] if org_row else None
                    user_row = await conn.fetchrow("SELECT id FROM users ORDER BY created_at DESC LIMIT 1")
                    user_id = user_row["id"] if user_row else "00000000-0000-0000-0000-000000000000"

                    if org_id:
                        await conn.execute(
                            """INSERT INTO assessments 
                               (id, org_id, user_id, framework, analysis_depth, assessment_type, status, 
                                compliance_score, answered_questions, total_questions, created_at, completed_at)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())""",
                            str(assessment_id), org_id, user_id, file.filename,
                            "comprehensive", "compliance_assessment", "complete",
                            compliance_score, total_controls, total_controls  # ✅ Verified variables match
                        )
        except Exception as db_err:
            logger.warning(f"Failed to create dashboard tracing database records: {db_err}")

        reports_db[report_id] = report

        result = {
            "report_id": report_id,
            "assessment_id": assessment_id,
            "cached": False,
            "compliance_score": compliance_score,
            "total_controls": total_controls,
            "framework": file.filename,
            **report
        }

        content_hash_cache[content_hash] = result
        return result

    except Exception as e:
        logger.error(f"Multi-agent line execution crashed out: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed to process policy: {str(e)}")

@router.get("/report/{report_id}")
async def get_report(report_id: str):
    """Returns a structured report by ID."""
    if report_id not in reports_db:
        raise HTTPException(status_code=404, detail="Report not found")
    return reports_db[report_id]

@router.get("/assessments")
async def list_agent_assessments():
    """List all AI agent assessments from PG (ones created by the agent)."""
    results = []
    try:
        if pg_pool:
            async with pg_pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT a.id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                              a.compliance_score, a.total_questions, a.answered_questions,
                              a.created_at, a.completed_at, o.name AS org_name, o.industry
                       FROM assessments a
                       JOIN organizations o ON o.id = a.org_id
                       WHERE o.name = 'AI Agent Auto-Org'
                       ORDER BY a.created_at DESC LIMIT 20"""
                )
                for row in rows:
                    results.append(dict(row))
    except Exception as e:
        logger.warning(f"Failed to list agent assessments from PG: {e}")

    return {"assessments": results}