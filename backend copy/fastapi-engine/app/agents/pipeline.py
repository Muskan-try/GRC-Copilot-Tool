import os
from dotenv import load_dotenv
load_dotenv() # This forces Python to look for your .env file and read your key!
from typing import List, Any
from pydantic import BaseModel, Field
from groq import Groq
import sys


# Dynamically find the absolute path to the 'fastapi-engine' directory and add it to Python's path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
# Import the specialized agent sub-engines we wrote in previous steps
from app.agents.parser_engine import extract_text_from_file, run_extractor_agent, is_security_policy
from app.agents.mapper_engine import run_mapper_agent

# Initialize Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

from typing import List, Optional, Any  # Added Optional

# 1. Update our schema to allow controls_found_count to be set later
class ComplianceGapReport(BaseModel):
    controls_found_count: Optional[int] = Field(default=0, description="Total number of discrete controls extracted")
    gaps_identified: List[str] = Field(description="List of security requirements completely missing or unaddressed in the policy")
    open_risks: List[str] = Field(description="Security vulnerabilities or compliance liabilities introduced by these gaps")
    compliance_recommendations: List[str] = Field(description="Actionable steps for engineering/management to remediate gaps")

# 2. Tightened Auditor Agent Logic
def run_auditor_agent(mapping_data: Any, raw_evidence_text: str, target_framework: str = "all") -> ComplianceGapReport:
    """Reviews the cross-framework mappings against the original asset text to compile gaps and risks."""
    
    framework_context = f"specifically the {target_framework} framework" if target_framework != "all" else "all supported compliance frameworks"
    
    system_instruction = (
        "You are an expert Chief Information Security Officer (CISO) and Lead External Compliance Auditor.\n"
        f"Your task is to analyze the extracted framework mappings of an uploaded compliance document and evaluate it against {framework_context} "
        "to construct a thorough gap and risk analysis.\n\n"
        "CRITICAL OUTPUT RULES:\n"
        "1. You MUST output a single valid JSON object.\n"
        "2. The JSON object keys must be exactly: 'gaps_identified', 'open_risks', and 'compliance_recommendations'.\n"
        "3. Each key MUST contain a simple list of strings (List[str]).\n"
        "4. DO NOT use nested objects, IDs, or dictionaries within these lists. Only plain text strings.\n"
        f"5. Focus ONLY on gaps related to {framework_context}."
    )

    # Convert the mappings payload into a clear readable string text block for the LLM context
    mappings_summary = ""
    for item in mapping_data.final_mappings:
        mappings_summary += f"- Evidence Control: '{item.evidence_text}' mapped to {item.mapped_framework} ({item.framework_control_id})\n"

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"RAW POLICY DOCUMENT TEXT:\n{raw_evidence_text}\n\nFRAMEWORK MAPPINGS FOR {target_framework.upper()}:\n{mappings_summary}"}
        ],
        response_format={"type": "json_object"}
    )
    
    raw_json = response.choices[0].message.content
    
    # Quick debug fallback: print out what the model sent back if validation fails
    try:
        return ComplianceGapReport.model_validate_json(raw_json)
    except Exception as e:
        print(f"\n[DEBUG] Raw JSON from model that failed validation:\n{raw_json}\n")
        raise e

from loguru import logger

# --- THE AGENT PIPELINE ORCHESTRATOR ---
def execute_grc_agent_pipeline(file_name: str, target_framework: str = "all"):
    """Orchestrates the entire Multi-Agent flow sequentially."""
    current_dir = os.getcwd()
    absolute_file_path = os.path.join(current_dir, file_name)
    
    logger.info("=================== STARTING GRC AGENT PIPELINE ===================")
    logger.info(f"[Step 1/4] Extracting structural content strings from: {file_name}...")
    raw_text = extract_text_from_file(absolute_file_path)
    
    # NEW: Validate if the document is actually a security policy
    logger.info("[Validation] Verifying document type...")
    if not is_security_policy(raw_text):
        logger.error(f"Validation failed: {file_name} is not recognized as a security policy document.")
        raise ValueError("Invalid document type. Please upload a security policy, compliance standard, or organizational manual (PDF, DOCX, TXT).")

    logger.info("[Step 2/4] Initializing Agent A: Executing Control Extraction...")
    extraction_payload = run_extractor_agent(raw_text)
    logger.info(f"-> Successfully extracted {len(extraction_payload.controls_found)} discrete controls.")
    
    logger.info(f"[Step 3/4] Initializing Agent B: Mapping Controls to Vector Database (Target: {target_framework})...")
    mapping_payload = run_mapper_agent(extraction_payload.controls_found, target_framework=target_framework)
    
    logger.info("[Step 4/4] Initializing Agent C: Compiling Gap & Risk Analysis Audit...")
    gap_report = run_auditor_agent(mapping_payload, raw_text, target_framework=target_framework)
    gap_report.controls_found_count = len(extraction_payload.controls_found)
    
    logger.info("=================== PIPELINE EXECUTION SUCCESSFUL ===================\n")
    
    # --- LOG FINAL COMPILED RESULTS ---
    logger.debug("### EXTRACTED MAPPINGS TABLE DATA ###")
    for map_item in mapping_payload.final_mappings:
        logger.debug(f"[{map_item.evidence_id}] \"{map_item.evidence_text[:40]}...\" -> {map_item.mapped_framework} ({map_item.framework_control_id}) [Confidence: {map_item.confidence_score}]")
        
    return mapping_payload, gap_report

if __name__ == "__main__":
    # Test file execution targeting your local sample file
    execute_grc_agent_pipeline("sample_policy.docx")