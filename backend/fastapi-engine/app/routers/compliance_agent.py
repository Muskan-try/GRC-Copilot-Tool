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

from app.modules.compliance_agent.policy_parser import policy_parser

router = APIRouter()

def validate_file_securely(header: bytes, filename: str) -> str:
    """
    Verifies that the detected MIME type matches the file extension and is exactly
    application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document.
    Raises ValueError if signature verification fails.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext == ".pdf":
        if header.startswith(b'%PDF'):
            return "application/pdf"
    
    elif ext == ".docx":
        if header.startswith(b'PK\x03\x04'):
            docx_indicators = [
                b'word/document.xml',
                b'word/_rels/',
                b'[Content_Types].xml',
                b'word/settings.xml'
            ]
            if any(indicator in header for indicator in docx_indicators):
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            
    raise ValueError("Security Violation: Invalid file structure content detected.")

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
        header = await file.read(2048)
        file.file.seek(0)
        try:
            validate_file_securely(header, file.filename)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        content = await file.read()
        return {
            "filename": file.filename,
            "size": len(content),
            "status": "uploaded",
            "message": "Policy uploaded successfully. You can now run the compliance mapping agent."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload policy: {str(e)}")

def generate_rule_based_analysis(policy_text: str, selected_framework: str) -> dict:
    """
    Fallback rule-based compliance analyzer.
    Analyzes policy_text against selected_framework by checking keyword coverage
    and generating standard gaps/remediations for missing controls.
    """
    import re
    logger.info(f"Using rule-based fallback analysis for framework: {selected_framework}")
    
    # Normalize framework name
    fw = str(selected_framework).lower()
    
    # Define framework baselines: list of requirements, their description, priority, keywords to look for, and remediation plan
    baseline = []
    
    if "hipaa" in fw:
        baseline = [
            {
                "gap_title": "Designated Security Official",
                "description": "Lack of a formally designated Security Official responsible for the development and implementation of security policies and procedures (164.308(a)(2)).",
                "priority": "High",
                "keywords": ["security officer", "security official", "ciso", "information security manager", "security role"],
                "remediation_plan": "Formally designate a Security Officer and document their roles, responsibilities, and authority regarding ePHI protection."
            },
            {
                "gap_title": "Risk Analysis and Management",
                "description": "No documented process for conducting regular, comprehensive risk analyses to identify vulnerabilities to ePHI (164.308(a)(1)(ii)(A)).",
                "priority": "High",
                "keywords": ["risk analysis", "risk assessment", "risk management", "vulnerability assessment", "threat modeling"],
                "remediation_plan": "Establish a policy and procedure to conduct and document a comprehensive security risk analysis at least annually."
            },
            {
                "gap_title": "Workforce Security Awareness Training",
                "description": "Absence of mandatory and regular security awareness training programs for all workforce members handling ePHI (164.308(a)(5)).",
                "priority": "Medium",
                "keywords": ["awareness training", "security training", "workforce training", "education", "training program"],
                "remediation_plan": "Implement a mandatory annual security awareness training program for all employees with access to ePHI, and maintain completion records."
            },
            {
                "gap_title": "Contingency Planning",
                "description": "Lack of comprehensive contingency plans covering data backup, disaster recovery, and emergency mode operations (164.308(a)(7)).",
                "priority": "High",
                "keywords": ["contingency plan", "disaster recovery", "backup", "data backup", "business continuity", "emergency mode"],
                "remediation_plan": "Develop, document, and test a comprehensive Contingency Plan, including daily automated backups, a disaster recovery site, and emergency procedures."
            },
            {
                "gap_title": "Encryption of ePHI at Rest and in Transit",
                "description": "No clear policy or enforcement mechanism for encrypting sensitive electronic protected health information (ePHI) during storage and transmission (164.312(a)(2)(iv) and 164.312(e)(2)(ii)).",
                "priority": "High",
                "keywords": ["encrypt", "encryption", "tls", "ssl", "aes", "transit", "rest", "secure transmission"],
                "remediation_plan": "Enforce AES-256 encryption for all ePHI at rest and TLS 1.3/1.2 for all ePHI in transit across the organization."
            },
            {
                "gap_title": "Audit Controls and Activity Monitoring",
                "description": "Lack of hardware, software, or procedural mechanisms that record and examine activity in systems containing or using ePHI (164.312(b)).",
                "priority": "Medium",
                "keywords": ["audit log", "activity monitoring", "access log", "audit control", "log review", "siem"],
                "remediation_plan": "Implement centralized logging for all systems containing ePHI, and establish procedures for weekly review of audit logs."
            },
            {
                "gap_title": "Automatic Logoff / Idle Timeout",
                "description": "Absence of electronic procedures to terminate active sessions after a predetermined period of inactivity (164.312(a)(2)(iii)).",
                "priority": "Medium",
                "keywords": ["automatic logoff", "timeout", "inactivity", "idle session", "session termination", "lock screen"],
                "remediation_plan": "Configure automatic screen locks and session timeouts of 15 minutes or less on all workstations and portals accessing ePHI."
            },
            {
                "gap_title": "Facility Access Controls",
                "description": "Lack of physical access controls to limit access to electronic information systems and the facility or facilities in which they are housed (164.310(a)(1)).",
                "priority": "Medium",
                "keywords": ["physical access", "facility access", "badge", "visitor log", "biometric", "server room", "keycard"],
                "remediation_plan": "Restrict physical access to data centers and server rooms to authorized personnel using keycards, visitor logs, and video surveillance."
            },
            {
                "gap_title": "Breach Notification Process",
                "description": "No documented policy or procedure for identifying, assessing, and notifying individuals and HHS in the event of an ePHI breach (164.404 / 164.410).",
                "priority": "High",
                "keywords": ["breach notification", "incident notification", "hhs", "60 days", "notification process", "reporting breach"],
                "remediation_plan": "Draft a formal Breach Notification Policy detailing roles, criteria for notification, templates, and the mandated 60-day reporting timeline."
            }
        ]
    elif "iso" in fw or "27001" in fw:
        baseline = [
            {
                "gap_title": "Information Security Policies",
                "description": "Lack of defined topic-specific policies (e.g., access control, encryption, remote work) supporting the high-level security policy (A.5.1).",
                "priority": "Medium",
                "keywords": ["topic-specific", "security policies", "policy review", "policy approval"],
                "remediation_plan": "Create, approve, and regularly review a set of topic-specific policies covering access control, cryptography, and clean desk/clean screen rules."
            },
            {
                "gap_title": "Roles and Responsibilities Definition",
                "description": "Roles and responsibilities for information security are not clearly allocated or documented across the organization (A.5.2).",
                "priority": "Medium",
                "keywords": ["roles", "responsibilities", "security organization", "ownership", "allocation of roles"],
                "remediation_plan": "Define a clear information security organization chart and assign security responsibilities within job descriptions."
            },
            {
                "gap_title": "Identity and Access Management",
                "description": "No formal user provisioning or de-provisioning process, or clear identity verification requirements (A.5.15).",
                "priority": "High",
                "keywords": ["identity management", "provisioning", "deprovisioning", "user registration", "access review"],
                "remediation_plan": "Establish a formal user lifecycle management procedure, including manager approvals for role changes and immediate revocation upon exit."
            },
            {
                "gap_title": "Multi-Factor Authentication",
                "description": "Absence of secure authentication mechanisms such as Multi-Factor Authentication (MFA) for accessing sensitive systems (A.8.5).",
                "priority": "High",
                "keywords": ["mfa", "2fa", "multi-factor", "secure authentication", "biometric", "passwordless"],
                "remediation_plan": "Enforce Multi-Factor Authentication (MFA) for all user logins, especially for remote access and administrative portals."
            },
            {
                "gap_title": "User Endpoint Device Control",
                "description": "No documented policy or mobile device management (MDM) constraints for bring-your-own-device (BYOD) or corporate endpoints (A.8.1).",
                "priority": "Medium",
                "keywords": ["endpoint device", "mdm", "mobile device", "byod", "endpoint security", "laptop control"],
                "remediation_plan": "Implement a BYOD and Endpoint Security Policy, and enroll all corporate assets in a centralized MDM system."
            },
            {
                "gap_title": "Regular Backup Testing",
                "description": "Lack of procedures for taking regular backups or verifying restore capabilities through periodic tests (A.8.13).",
                "priority": "High",
                "keywords": ["backup", "restore", "data backup", "backup test", "recovery testing"],
                "remediation_plan": "Configure automated daily backups with offsite replication, and perform simulated restore testing every quarter."
            },
            {
                "gap_title": "Use of Cryptography",
                "description": "No central policy on the use of cryptography, key management rules, or permitted cipher suites (A.8.24).",
                "priority": "High",
                "keywords": ["cryptography", "encryption policy", "key management", "cipher suite", "cryptographic keys"],
                "remediation_plan": "Define a Cryptographic Policy mandating AES-256 for storage and TLS 1.3 for data transmission, including key rotation guidelines."
            },
            {
                "gap_title": "Logging and Monitoring",
                "description": "Audit logs recording user activities, exceptions, and security events are not produced, kept, or regularly reviewed (A.8.15 / A.8.16).",
                "priority": "Medium",
                "keywords": ["audit log", "log review", "logging", "monitoring", "siem", "event log"],
                "remediation_plan": "Deploy a centralized log aggregation tool (SIEM) and implement automated alerting for unauthorized access attempts."
            },
            {
                "gap_title": "Information Deletion and Disposal",
                "description": "Lack of secure deletion procedures for data that has reached the end of its retention period (A.8.10).",
                "priority": "Low",
                "keywords": ["deletion", "disposal", "retention period", "shredding", "secure wipe"],
                "remediation_plan": "Define a Data Retention and Disposal Policy, and implement secure wiping or physical destruction for retired storage media."
            }
        ]
    elif "gdpr" in fw:
        baseline = [
            {
                "gap_title": "Data Minimization and storage limitation",
                "description": "Failure to outline data minimization principles or maximum storage/retention limits for personal data processing (Art 5).",
                "priority": "Medium",
                "keywords": ["minimization", "storage limitation", "retention limit", "data retention", "processing limit"],
                "remediation_plan": "Update internal policies to explicitly define retention periods for each category of personal data and implement automated purging."
            },
            {
                "gap_title": "Lawful Basis for Processing",
                "description": "Lack of clearly documented legal bases (such as consent or legitimate interest) for all personal data processing activities (Art 6).",
                "priority": "High",
                "keywords": ["lawful basis", "consent", "legitimate interest", "legal basis", "processing basis"],
                "remediation_plan": "Document a processing register (Article 30 ROPA) mapping every personal data category to its corresponding lawful basis."
            },
            {
                "gap_title": "Privacy Notice transparency",
                "description": "Absence of a comprehensive, customer-facing privacy policy describing what data is collected, processed, and shared (Art 13/14).",
                "priority": "High",
                "keywords": ["privacy notice", "privacy policy", "disclosure", "transparency", "information to be provided"],
                "remediation_plan": "Publish an updated Privacy Notice on the public website detailing rights, categories of data, and contact info of the DPO/representative."
            },
            {
                "gap_title": "Data Subject Access Request (DSAR) Procedure",
                "description": "No formal procedure or dedicated contact points for handling data subject rights, including access, correction, and deletion requests (Art 15/17).",
                "priority": "High",
                "keywords": ["subject access request", "dsar", "right of access", "right to erasure", "forgotten", "data subject rights"],
                "remediation_plan": "Create an internal DSAR fulfillment playbook ensuring responses are delivered within the statutory 30-day window."
            },
            {
                "gap_title": "Privacy by Design and Default",
                "description": "Lack of established procedures to integrate data protection measures into project lifecycles and software development (Art 25).",
                "priority": "Medium",
                "keywords": ["privacy by design", "privacy by default", "design and default", "data protection by design"],
                "remediation_plan": "Embed privacy-by-design checklists into the product development lifecycle and enforce data minimization by default."
            },
            {
                "gap_title": "Technical and Organizational Security Measures",
                "description": "Failure to define mandatory technical safeguards such as pseudonymization, encryption, or access controls to protect personal data (Art 32).",
                "priority": "High",
                "keywords": ["pseudonymization", "encryption", "technical measures", "organizational measures", "security of processing"],
                "remediation_plan": "Adopt standard encryption protocols (AES-256) for stored personal data and implement role-based access control (RBAC)."
            },
            {
                "gap_title": "Data Breach Management and 72-Hour Notification",
                "description": "No incident response procedure ensuring that personal data breaches are assessed and reported to the supervisory authority within 72 hours (Art 33).",
                "priority": "High",
                "keywords": ["breach notification", "72 hours", "supervisory authority", "data breach", "breach reporting"],
                "remediation_plan": "Develop a Data Breach Incident Response Plan containing notification templates and a clear escalation workflow to meet the 72-hour reporting deadline."
            },
            {
                "gap_title": "Data Protection Impact Assessment (DPIA)",
                "description": "No documented triggers or templates for conducting Data Protection Impact Assessments for high-risk processing operations (Art 35).",
                "priority": "Medium",
                "keywords": ["impact assessment", "dpia", "high risk processing", "risk assessment"],
                "remediation_plan": "Establish a DPIA Policy specifying when assessments are mandatory, and design a template to assess risks to data subjects."
            }
        ]
    else:
        # Default fallback framework (e.g. SOC 2 or general compliance)
        baseline = [
            {
                "gap_title": "Role-Based Access Control (RBAC)",
                "description": "Lack of defined user access roles resulting in potential privilege accumulation and unauthorized system access (CC6.1/CC6.2).",
                "priority": "High",
                "keywords": ["access control", "rbac", "role-based", "least privilege", "user access", "authorization"],
                "remediation_plan": "Implement role-based access control policies, ensuring employees only have access permissions necessary for their direct role."
            },
            {
                "gap_title": "Multi-Factor Authentication (MFA)",
                "description": "No mandatory requirement for Multi-Factor Authentication for local or remote administrative access (CC6.2).",
                "priority": "High",
                "keywords": ["mfa", "2fa", "multi-factor", "authentication", "credentials", "passwords"],
                "remediation_plan": "Enforce MFA for all user logins, especially for administrative portals, code repositories, and production environments."
            },
            {
                "gap_title": "Data Encryption in Transit and at Rest",
                "description": "Absence of clear directives requiring encryption for sensitive database storage and API communication (CC6.6).",
                "priority": "High",
                "keywords": ["encryption", "transit", "rest", "tls", "ssl", "aes", "cryptography"],
                "remediation_plan": "Enforce TLS 1.2+ for all network communications and AES-256 encryption for data at rest on cloud servers and backups."
            },
            {
                "gap_title": "Centralized Log Auditing and Monitoring",
                "description": "No system log aggregation or security event monitoring to detect unauthorized actions or anomalous behaviors (CC7.1).",
                "priority": "Medium",
                "keywords": ["logging", "monitoring", "audit logs", "siem", "event log", "alerts"],
                "remediation_plan": "Set up centralized log forwarding to a secure logging server, and establish a weekly review process for critical access logs."
            },
            {
                "gap_title": "Incident Response Plan (IRP)",
                "description": "Lack of a documented playbook for identifying, containing, and communicating security incidents or system failures (CC7.2).",
                "priority": "High",
                "keywords": ["incident response", "incident plan", "irp", "breach notification", "security incident", "recovery playbook"],
                "remediation_plan": "Draft a formal Incident Response Plan detailing response phases, key roles, communication templates, and reporting timelines."
            },
            {
                "gap_title": "Formal Change Management",
                "description": "No documented policy or review workflow for code development, testing, and production deployment authorization (CC8.1).",
                "priority": "Medium",
                "keywords": ["change control", "change management", "code review", "pull request", "deployment testing"],
                "remediation_plan": "Implement a Change Management process requiring pull request reviews, automated CI testing, and manager deployment approval."
            },
            {
                "gap_title": "Annual Security Risk Assessment",
                "description": "Lack of a structured process to identify, analyze, and mitigate internal and external compliance risks (CC9.1).",
                "priority": "Medium",
                "keywords": ["risk assessment", "risk analysis", "vulnerability assessment", "threat modeling"],
                "remediation_plan": "Establish an annual risk assessment procedure led by senior management to identify organizational security risks and track mitigations."
            }
        ]
        
    # Process text to find matches
    text_lower = policy_text.lower()
    
    gaps = []
    # Evaluate each requirement in baseline
    for item in baseline:
        # Check if keywords are present in the parsed policy text
        # If any of the keywords are present, we consider the control "addressed"
        # If none of the keywords are present, we identify it as a GAP
        matched = False
        for kw in item["keywords"]:
            if kw in text_lower:
                matched = True
                break
                
        if not matched:
            # It's a gap!
            gaps.append({
                "gap_title": item["gap_title"],
                "description": item["description"],
                "priority": item["priority"],
                "remediation_plan": item["remediation_plan"]
            })
            
    # Calculate score based on gaps
    deductions = 0
    for g in gaps:
        priority = g["priority"]
        if priority == "High":
            deductions += 15
        elif priority == "Medium":
            deductions += 8
        else:
            deductions += 3
            
    score = max(0, 100 - deductions)
    recommendations = [g["remediation_plan"] for g in gaps]
    
    return {
        "score": float(score),
        "gaps": gaps,
        "recommendations": recommendations,
        "method": "rule_based_fallback"
    }

@router.post("/analyze-policy")
async def analyze_policy(
    file: UploadFile = File(...),
    selectedFramework: str = Form(...),
    org_id: str = Form(...)
):
    """Parses document text stream and maps gaps against selected framework using active Auditor Agent."""
    try:
        header = await file.read(2048)
        file.file.seek(0)
        try:
            validate_file_securely(header, file.filename)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
            
        logger.info(f"Analyzing policy: {file.filename} under framework {selectedFramework} for org {org_id}")
        
        # 1. Parse policy text using PDF/DOCX parser
        try:
            policy_text = policy_parser.parse(content, file.filename)
        except Exception as parse_err:
            logger.error(f"Text extraction failed for {file.filename}: {parse_err}")
            raise HTTPException(status_code=400, detail=f"Failed to parse policy document structure: {str(parse_err)}")
            
        if not policy_text or not policy_text.strip():
            raise HTTPException(status_code=400, detail="Policy text extraction returned empty or is unreadable.")
            
        # 2. Connect to the AI Agent Engine
        from app.modules.ai_agent.ai_analyzer import LLMFactory
        import json
        
        provider = LLMFactory.create_provider(os.getenv("LLM_PROVIDER", "groq"))
        
        system_prompt = f"You are an active GRC Compliance Auditor Agent. Review this parsed policy document text against {selectedFramework} control regulations. Identify the actual missing clauses, technical vulnerabilities, or process gaps present strictly in this unique text. Generate a dynamic JSON response tracking: gap_title, description, priority, and remediation_plan."
        
        user_prompt = f"""
        Review the following parsed policy document:
        Filename: {file.filename}
        Organization context ID: {org_id}
        Target Framework: {selectedFramework}
        
        Document Text:
        {policy_text[:15000]}
        
        Identify all missing clauses, technical vulnerabilities, or process gaps present strictly in this unique text against {selectedFramework} regulations.
        
        Provide your findings in a strict JSON format with a single key "gaps" containing an array of objects.
        Each object in the "gaps" array must have the following keys:
        - "gap_title": A concise title for the identified gap.
        - "description": A clear description of the missing clause or vulnerability.
        - "priority": Priority level, strictly one of "High", "Medium", or "Low".
        - "remediation_plan": A clear, actionable remediation step to resolve the gap.
        
        Return ONLY valid JSON matching this exact structure:
        {{
          "gaps": [
            {{
              "gap_title": "...",
              "description": "...",
              "priority": "High|Medium|Low",
              "remediation_plan": "..."
            }}
          ]
        }}
        """
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_content = None
        try:
            response_content = await provider.chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=4000,
                json_mode=True
            )
        except Exception as api_err:
            logger.warning(f"Groq API call failed: {api_err}. Falling back to rule-based analysis.")
            
        if not response_content:
            logger.warning("Groq API returned empty response. Falling back to rule-based analysis.")
            fallback_res = generate_rule_based_analysis(policy_text, selectedFramework)
            return fallback_res
            
        try:
            parsed_response = json.loads(response_content)
        except json.JSONDecodeError as je:
            logger.error(f"JSON decode failed for response: {response_content}. Error: {je}. Falling back to rule-based analysis.")
            fallback_res = generate_rule_based_analysis(policy_text, selectedFramework)
            return fallback_res
            
        gaps = parsed_response.get("gaps", [])
        
        # Calculate dynamic compliance score
        # Deduct based on weight: High = -15, Medium = -8, Low = -3, minimum of 0
        deductions = 0
        for g in gaps:
            priority = str(g.get("priority", "Low")).strip().title()
            if priority == "High":
                deductions += 15
            elif priority == "Medium":
                deductions += 8
            else:
                deductions += 3
                
        score = max(0, 100 - deductions)
        
        # Extract recommendations list
        recommendations = [g.get("remediation_plan") for g in gaps if g.get("remediation_plan")]
        
        return {
            "score": float(score),
            "gaps": gaps,
            "recommendations": recommendations
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in policy upload analysis: {e}")
        # Final safety fallback
        try:
            fallback_res = generate_rule_based_analysis(policy_text, selectedFramework)
            return fallback_res
        except Exception as fallback_err:
            logger.error(f"Fallback analysis failed: {fallback_err}")
            raise HTTPException(status_code=500, detail=f"Failed to analyze policy: {str(e)}")

@router.post("/run")
async def run_agent(
    file: UploadFile = File(...),
    target_framework: str = Form("all")
):
    """Runs our new Multi-Agent Vector Pipeline on the uploaded policy, preserving existing DB integration."""
    try:
        header = await file.read(2048)
        file.file.seek(0)
        try:
            validate_file_securely(header, file.filename)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

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

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
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
        header = await file.read(2048)
        file.file.seek(0)
        try:
            validate_file_securely(header, file.filename)
        except ValueError as ve:
            raise HTTPException(status_code=400, detail=str(ve))

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
async def list_agent_assessments(org_id: Optional[str] = None):
    """List all AI agent assessments from PG (ones created by the agent) with optional tenant filtering."""
    results = []
    try:
        if database.pg_pool:
            async with database.pg_pool.acquire() as conn:
                if org_id:
                    # Resolve UUID conversion for asyncpg type matching
                    parsed_org_id = org_id
                    if isinstance(org_id, str):
                        try:
                            parsed_org_id = uuid.UUID(org_id)
                        except ValueError:
                            pass
                    rows = await conn.fetch(
                        """SELECT a.id, a.org_id, a.user_id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                                  a.compliance_score, a.total_questions, a.answered_questions,
                                  a.created_at, a.completed_at, o.name AS org_name, o.industry
                           FROM assessments a
                           JOIN organizations o ON o.id = a.org_id
                           WHERE a.assessment_type = 'agent_assessment' AND a.org_id = $1
                           ORDER BY a.created_at DESC LIMIT 20""",
                        parsed_org_id
                    )
                else:
                    rows = await conn.fetch(
                        """SELECT a.id, a.org_id, a.user_id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                                  a.compliance_score, a.total_questions, a.answered_questions,
                                  a.created_at, a.completed_at, o.name AS org_name, o.industry
                           FROM assessments a
                           JOIN organizations o ON o.id = a.org_id
                           WHERE a.assessment_type = 'agent_assessment'
                           ORDER BY a.created_at DESC LIMIT 20"""
                    )
                for row in rows:
                    item = dict(row)
                    # Convert UUID objects to strings for JSON serialization
                    if item.get("id"): item["id"] = str(item["id"])
                    if item.get("org_id"): item["org_id"] = str(item["org_id"])
                    if item.get("user_id"): item["user_id"] = str(item["user_id"])
                    results.append(item)
    except Exception as e:
        logger.warning(f"Failed to list agent assessments from PG: {e}")

    return {"assessments": results}
