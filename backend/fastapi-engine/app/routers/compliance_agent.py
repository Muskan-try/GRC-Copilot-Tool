import os  
import re  
import uuid
import hashlib
import sys
# ✅ Fixed: Added Form to the FastAPI import block
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form 
from typing import Optional, List, Dict
from loguru import logger
import asyncpg
import httpx  # ✅ Fixed: Added missing HTTP async client library import

# ✅ Fixed: Imported the database module context to resolve 'database.pg_pool' flags
from app.core import database  
from app.core.database import pg_pool

# ✅ Fixed: Placeholder or direct utility for policy parsing to fix 'policy_parser' warning
# If you have an explicit custom document parser package elsewhere, map it here!
class LocalPolicyParser:
    def parse(self, content: bytes, filename: str) -> str:
        try:
            return content.decode("utf-8", errors="ignore")
        except Exception:
            return ""

policy_parser = LocalPolicyParser()

router = APIRouter()

# In-memory store for reports (for demo purposes)
reports_db: Dict[str, Dict] = {}
# Content-hash → report cache: same file always returns the same result
content_hash_cache: Dict[str, Dict] = {}

# Clear cache on reload to ensure filtered results are fresh
def clear_agent_cache():
    content_hash_cache.clear()
    logger.info("Agent content cache cleared.")

clear_agent_cache()

async def get_pg_conn():
    if not database.pg_pool:
        raise HTTPException(status_code=500, detail="PostgreSQL pool not initialized")
    async with database.pg_pool.acquire() as conn:
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
async def run_agent(
    file: UploadFile = File(...),
    target_framework: str = Form("all")
):
    """Runs our new Multi-Agent Vector Pipeline on the uploaded policy, preserving existing DB integration."""
    try:
        content = await file.read()
        content_hash = hashlib.sha256(content).hexdigest()
        
        # Include target_framework in the cache key logic
        cache_key = f"{content_hash}_{target_framework}"

        if cache_key in content_hash_cache:
            cached = content_hash_cache[cache_key]
            logger.info(f"Cache hit for {file.filename} (framework: {target_framework})")
            cached["cached"] = True
            return cached

        # --- STEP 1: Stage file locally so our pipeline can parse it ---
        temp_storage_path = os.path.join(os.getcwd(), f"temp_upload_{file.filename}")
        with open(temp_storage_path, "wb") as buffer:
            buffer.write(content)

        # --- STEP 2: Execute our new Multi-Agent Pipeline ---
        from app.agents.pipeline import execute_grc_agent_pipeline
        mapping_payload, gap_report = execute_grc_agent_pipeline(temp_storage_path, target_framework=target_framework)

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
                            compliance_score, total_controls, total_controls  
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

        content_hash_cache[cache_key] = result
        return result

    except Exception as e:
        logger.error(f"Multi-agent line execution crashed out: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed to process policy: {str(e)}")

@router.post("/auto-answer")
async def auto_answer(
    file: UploadFile = File(...),
    assessment_id: str = Form(...),
    org_website: str = Form(None),
):
    """Upload a policy doc → extract text → keyword-match against questions → auto-answer."""
    try:
        content = await file.read()
        policy_text = policy_parser.parse(content, file.filename)

        # Extract org name from policy and optionally derive a website to scan
        org_name = None
        org_domain = None
        org_patterns = [
            r'(?:^|\n)\s*(.*?)\s+(?:Information Security Policy|Security Policy|Compliance Policy)',
            r'(?:Company|Organization|Inc\.|Ltd\.|LLC|Group)\s*[:;]\s*([A-Z][A-Za-z0-9\s.&,-]{3,60})',
            r'([A-Z][A-Za-z0-9\s.&,-]{3,60})\s+(?:Information Security|Security|Compliance|Privacy)\s+Policy',
        ]
        for pattern in org_patterns:
            m = re.search(pattern, policy_text, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip()
                if candidate and 2 < len(candidate) < 100:
                    org_name = candidate
                    break
        if not org_name:
            sentences = re.split(r'[.!?\n]', policy_text)
            for s in sentences[:15]:
                s = s.strip()
                words = s.split()
                if 2 <= len(words) <= 12 and s[0].isupper():
                    if any(kw in s.lower() for kw in ['inc', 'ltd', 'llc', 'corp', 'corporation', 'company', 'group', 'technologies', 'solutions', 'services']):
                        org_name = s
                        break

        # Generate potential website domain from org name
        if org_name and not org_website:
            clean = org_name.lower().split()[0] if org_name.split() else org_name.lower()
            clean = re.sub(r'[^a-z0-9]', '', clean)
            if clean and len(clean) > 3:
                org_domain = f"https://{clean}.com"
                org_website = org_domain

        STOP_WORDS = {'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
                      'is','are','was','were','be','been','being','have','has','had','do','does',
                      'did','will','would','could','should','may','might','shall','not','no',
                      'this','that','these','those','it','its','each','all','any','both','few',
                      'more','most','other','some','such','than','also','very','just','about',
                      'above','after','again','then','once','here','there','when','where','why',
                      'how','which','who','whom','what','can','into','over','between','under',
                      'further','page','report','section','provide','based','using','within',
                      'without','across','among','must'}

        words = re.findall(r'\b[a-zA-Z]{4,}\b', policy_text.lower())
        keywords = {w for w in words if w not in STOP_WORDS and not w.isdigit()}
        for fw_name in ['gdpr','iso','soc','hipaa','pci','nist','cis','dpdp','ccpa',
                        'fedramp','cobit','csa','ccm','iso27001','risk','compliance',
                        'security','privacy','audit','control','policy','data','access',
                        'encrypt','backup','incident','vendor','thirdparty']:
            if fw_name in policy_text.lower(): keywords.add(fw_name)

        website_scanned = False
        if org_website:
            try:
                url = org_website if org_website.startswith('http') else f'https://{org_website}'
                async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
                    resp = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
                    if resp.status_code == 200:
                        html = resp.text
                        text_clean = re.sub(r'<[^>]+>', ' ', html)
                        text_clean = re.sub(r'\s+', ' ', text_clean)
                        web_words = re.findall(r'\b[a-zA-Z]{4,}\b', text_clean.lower())
                        web_keywords = {w for w in web_words if w not in STOP_WORDS and not w.isdigit()}
                        keywords.update(list(web_keywords)[:100])
                        website_scanned = True
            except Exception:
                pass

        if not keywords:
            return {"matched_count": 0, "total_questions": 0, "matched_questions": [],
                    "message": "Could not extract meaningful keywords from the policy document."}

        matched_count = 0
        matched_questions = []

        if database.pg_pool:
            async with database.pg_pool.acquire() as conn:
                assess = await conn.fetchrow(
                    "SELECT analysis_depth FROM assessments WHERE id = $1", assessment_id
                )
                depth = assess["analysis_depth"] if assess else "quick"

                depth_filter = []
                if depth == "quick":
                    depth_filter = ["quick"]
                elif depth in ("intermediate", "standard"):
                    depth_filter = ["quick", "intermediate"]
                else:  
                    depth_filter = ["quick", "intermediate", "deep"]

                total_result = await conn.fetchrow(
                    """SELECT COUNT(*) as cnt FROM questions q
                       JOIN assessment_frameworks af ON q.framework_id = af.framework_id
                       WHERE af.assessment_id = $1 AND q.is_active = true
                       AND q.depth_levels && $2::text[]""",
                    assessment_id, depth_filter
                )
                total_questions = total_result["cnt"] if total_result else 0

                all_questions = await conn.fetch(
                    """SELECT q.question_id, q.text, q.hint, c.control_id, c.name as control_name,
                              c.domain as control_domain
                       FROM questions q
                       JOIN controls c ON q.control_id = c.id
                       JOIN assessment_frameworks af ON q.framework_id = af.framework_id
                       WHERE af.assessment_id = $1 AND q.is_active = true
                       AND q.depth_levels && $2::varchar[]""",
                    assessment_id, depth_filter
                )

                keyword_list = list(keywords)
                for row in all_questions:
                    q_combined = ((row["text"] or "") + " " + (row["hint"] or "") + " " +
                                  (row["control_name"] or "") + " " + (row["control_domain"] or "") +
                                  " " + (row["control_id"] or "")).lower()
                    matched_kw = sum(1 for kw in keyword_list if kw in q_combined)
                    if matched_kw >= 2:
                        matched_questions.append({
                            "question_id": row["question_id"],
                            "text": row["text"],
                            "control_id": row["control_id"],
                            "keyword_matches": matched_kw,
                        })
                        await conn.execute(
                            """INSERT INTO responses (assessment_id, question_id, answer_index, answer_text, auto_answered, submitted_at)
                               VALUES ($1, $2, 0, 'Auto-answered from policy: Compliant', true, NOW())
                               ON CONFLICT (assessment_id, question_id) DO NOTHING""",
                            assessment_id, row["question_id"]
                        )
                matched_count = len(matched_questions)

        return {
            "matched_count": matched_count,
            "total_questions": total_questions,
            "matched_questions": matched_questions,
            "organization_detected": org_name,
            "website_scanned": website_scanned,
            "message": f"Auto-answered {matched_count} of {total_questions} questions."
        }
    except Exception as e:
        logger.error(f"Auto-answer failed: {e}")
        raise HTTPException(status_code=500, detail=f"Auto-answer failed: {str(e)}")

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
        if database.pg_pool:
            async with database.pg_pool.acquire() as conn:
                rows = await conn.fetch(
                    """SELECT a.id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                              a.compliance_score, a.total_questions, a.answered_questions,
                              a.created_at, a.completed_at, o.name AS org_name, o.industry
                       FROM assessments a
                       JOIN organizations o ON o.id = a.org_id
                       WHERE a.assessment_type = 'agent_assessment'
                       ORDER BY a.created_at DESC LIMIT 20"""
                )
                for row in rows:
                    results.append(dict(row))
    except Exception as e:
        logger.warning(f"Failed to list agent assessments from PG: {e}")

    return {"assessments": results}