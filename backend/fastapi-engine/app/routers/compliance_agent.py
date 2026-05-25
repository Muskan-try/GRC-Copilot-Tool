from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import Optional, List, Dict
from loguru import logger
import uuid
import hashlib
import re
import httpx

from app.modules.compliance_agent.agent import agent
from app.core import database

# Rule-based pipeline imports (no API key needed)
from app.modules.compliance_agent.policy_parser import policy_parser
from app.modules.compliance_agent.control_extractor import control_extractor
from app.modules.compliance_agent.control_mapper import control_mapper

router = APIRouter()

# In-memory store for reports (for demo purposes)
reports_db: Dict[str, Dict] = {}
# Content-hash → report cache: same file always returns the same result
content_hash_cache: Dict[str, Dict] = {}

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

        # Don't set a compliance_score for agent runs — these aren't questionnaire-based
        # assessments, so a score would be misleading. Use NULL so frontend can distinguish.
        compliance_score = None

        # Create assessment record in PostgreSQL so it appears in the dashboard activity tracer
        assessment_id = str(uuid.uuid4())
        report_id = str(uuid.uuid4())
        try:
            if database.pg_pool:
                async with database.pg_pool.acquire() as conn:
                    # Find or create a default organization
                    org_row = await conn.fetchrow(
                        "SELECT id FROM organizations ORDER BY created_at DESC LIMIT 1"
                    )
                    if not org_row:
                        org_row = await conn.fetchrow(
                            "INSERT INTO organizations (name, user_id, region) VALUES ($1, (SELECT id FROM users LIMIT 1), $2) RETURNING id",
                            "AI Agent Auto-Org", "Global"
                        )
                    org_id = org_row["id"]

                    # Get first user
                    user_row = await conn.fetchrow("SELECT id FROM users ORDER BY created_at DESC LIMIT 1")
                    user_id = user_row["id"] if user_row else "00000000-0000-0000-0000-000000000000"

                    await conn.execute(
                        """INSERT INTO assessments 
                           (id, org_id, user_id, framework, analysis_depth, assessment_type, status, 
                            compliance_score, answered_questions, total_questions, created_at, completed_at)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
                           ON CONFLICT DO NOTHING""",
                        str(assessment_id), org_id, user_id, file.filename,
                        "comprehensive", "compliance_assessment", "complete",
                        compliance_score, total_controls, total_controls
                    )
                    logger.info(f"Created assessment record {assessment_id} for AI agent run")
        except Exception as db_err:
            logger.warning(f"Failed to create assessment record for agent: {db_err}")

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
        logger.error(f"Agent execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent failed to process policy: {str(e)}")

@router.post("/auto-answer")
async def auto_answer(
    file: UploadFile = File(...),
    assessment_id: str = Form(...),
    org_website: str = Form(None),
):
    """Upload a policy doc → extract text → keyword-match against questions → auto-answer.
    Optionally provide org_website to also scan the org's website for extra keywords."""
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
                # Get assessment depth to match the same question scope as the questionnaire
                assess = await conn.fetchrow(
                    "SELECT analysis_depth FROM assessments WHERE id = $1", assessment_id
                )
                depth = assess["analysis_depth"] if assess else "quick"

                # Filter by depth_levels to match what the questionnaire UI actually shows
                depth_filter = []
                if depth == "quick":
                    depth_filter = ["quick"]
                elif depth in ("intermediate", "standard"):
                    depth_filter = ["quick", "intermediate"]
                else:  # deep, comprehensive
                    depth_filter = ["quick", "intermediate", "deep"]

                total_result = await conn.fetchrow(
                    """SELECT COUNT(*) as cnt FROM questions q
                       JOIN assessment_frameworks af ON q.framework_id = af.framework_id
                       WHERE af.assessment_id = $1 AND q.is_active = true
                       AND q.depth_levels && $2::varchar[]""",
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
                       WHERE o.name = 'AI Agent Auto-Org'
                       ORDER BY a.created_at DESC LIMIT 20"""
                )
                for row in rows:
                    results.append(dict(row))
    except Exception as e:
        logger.warning(f"Failed to list agent assessments from PG: {e}")

    return {"assessments": results}
