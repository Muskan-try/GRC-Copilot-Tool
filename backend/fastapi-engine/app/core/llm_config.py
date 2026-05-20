"""
LLM Configuration for GRC Copilot AI Compliance Agent
Supports: Groq, OpenAI, Anthropic, Google, Local LLMs
"""
import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class LLMConfig:
    provider: str = "groq"
    api_key: Optional[str] = None
    model_name: str = "llama-3.1-8b-instant"
    base_url: Optional[str] = None
    timeout: int = 120
    max_tokens: int = 4096
    temperature: float = 0.3


# Default configuration with environment variable overrides
DEFAULT_CONFIG = LLMConfig(
    provider=os.getenv("LLM_PROVIDER", "groq"),
    api_key=os.getenv("GROQ_API_KEY") or os.getenv("LLM_API_KEY"),
    model_name=os.getenv("LLM_MODEL", "llama-3.1-8b-instant"),
    base_url=os.getenv("LLM_BASE_URL"),
    timeout=int(os.getenv("LLM_TIMEOUT", "120")),
    max_tokens=int(os.getenv("LLM_MAX_TOKENS", "4096")),
    temperature=float(os.getenv("LLM_TEMPERATURE", "0.3")),
)


# Framework control mappings for the compliance agent
FRAMEWORK_CONTROLS = {
    "ISO 27001:2022": {
        "A.5.1": {"name": "Information security policies", "category": "Organizational Controls"},
        "A.5.2": {"name": "Information security roles and responsibilities", "category": "Organizational Controls"},
        "A.5.3": {"name": "Segregation of duties", "category": "Organizational Controls"},
        "A.5.4": {"name": "Management responsibilities", "category": "Organizational Controls"},
        "A.5.15": {"name": "Identity management", "category": "Access Control"},
        "A.5.16": {"name": "Authentication information", "category": "Access Control"},
        "A.5.17": {"name": "Access rights", "category": "Access Control"},
        "A.5.18": {"name": "Access provisioning", "category": "Access Control"},
        "A.5.19": {"name": "Access review", "category": "Access Control"},
        "A.5.20": {"name": "Access removal", "category": "Access Control"},
        "A.5.21": {"name": "Restriction of access", "category": "Access Control"},
        "A.5.22": {"name": "Privileged utility programs", "category": "Access Control"},
        "A.5.23": {"name": "Access to source code", "category": "Access Control"},
        "A.5.30": {"name": "Physical security monitoring", "category": "Physical Security"},
        "A.8.1": {"name": "User endpoint devices", "category": "Asset Management"},
        "A.8.2": {"name": "Privileged access", "category": "Access Control"},
        "A.8.5": {"name": "Secure authentication", "category": "Access Control"},
        "A.8.9": {"name": "Configuration management", "category": "Asset Management"},
        "A.8.10": {"name": "Information deletion", "category": "Asset Management"},
        "A.8.11": {"name": "Data masking", "category": "Asset Management"},
        "A.8.12": {"name": "Data leakage prevention", "category": "Asset Management"},
        "A.8.13": {"name": "Information backup", "category": "Asset Management"},
        "A.8.14": {"name": "Data recovery", "category": "Asset Management"},
        "A.8.15": {"name": "Data archiving", "category": "Asset Management"},
        "A.8.16": {"name": "Monitoring activities", "category": "Monitoring"},
        "A.8.20": {"name": "Network security", "category": "Network Security"},
        "A.8.21": {"name": "Network segmentation", "category": "Network Security"},
        "A.8.22": {"name": "Network connection control", "category": "Network Security"},
        "A.8.23": {"name": "Network routing", "category": "Network Security"},
        "A.8.24": {"name": "Use of cryptography", "category": "Cryptography"},
        "A.8.25": {"name": "Cryptographic key management", "category": "Cryptography"},
        "A.8.26": {"name": "Key lifecycle management", "category": "Cryptography"},
        "A.8.27": {"name": "Key storage", "category": "Cryptography"},
        "A.8.28": {"name": "Key usage", "category": "Cryptography"},
        "A.8.30": {"name": "Secure development", "category": "Development"},
        "A.8.31": {"name": "Secure system architecture", "category": "Development"},
        "A.8.32": {"name": "Secure coding", "category": "Development"},
        "A.12.1": {"name": "Operational procedures", "category": "Operations"},
        "A.12.2": {"name": "Change management", "category": "Operations"},
        "A.12.3": {"name": "Capacity management", "category": "Operations"},
        "A.12.4": {"name": "Separation of development and production", "category": "Operations"},
        "A.12.5": {"name": "Protection of information", "category": "Operations"},
        "A.12.6": {"name": "Utility programs", "category": "Operations"},
        "A.12.7": {"name": "Information handling procedures", "category": "Operations"},
        "A.13.1": {"name": "Information security incident management", "category": "Incident Management"},
        "A.13.2": {"name": "Incident response", "category": "Incident Management"},
        "A.13.3": {"name": "Incident reporting", "category": "Incident Management"},
        "A.13.4": {"name": "Incident assessment", "category": "Incident Management"},
        "A.13.5": {"name": "Incident response testing", "category": "Incident Management"},
        "A.14.1": {"name": "Business continuity management", "category": "BCP/DR"},
        "A.14.2": {"name": "Business impact analysis", "category": "BCP/DR"},
        "A.15.1": {"name": "Information security for supply chain", "category": "Supplier"},
        "A.15.2": {"name": "Supplier agreements", "category": "Supplier"},
        "A.16.1": {"name": "Incident response planning", "category": "Incident Management"},
        "A.17.1": {"name": "Information security continuity", "category": "BCP/DR"},
        "A.17.2": {"name": "Redundancy", "category": "BCP/DR"},
        "A.18.1": {"name": "Compliance review", "category": "Compliance"},
        "A.18.2": {"name": "Compliance monitoring", "category": "Compliance"},
    },
    "GDPR": {
        "Art 5": {"name": "Principles relating to processing of personal data", "category": "General"},
        "Art 6": {"name": "Lawfulness of processing", "category": "General"},
        "Art 9": {"name": "Processing of special categories of personal data", "category": "Data Protection"},
        "Art 12": {"name": "Transparent information, communication and modalities", "category": "Rights"},
        "Art 13": {"name": "Information to be provided where personal data are collected", "category": "Transparency"},
        "Art 14": {"name": "Information to be provided where personal data have not been obtained", "category": "Transparency"},
        "Art 15": {"name": "Right of access by the data subject", "category": "Rights"},
        "Art 16": {"name": "Right to rectification", "category": "Rights"},
        "Art 17": {"name": "Right to erasure (Right to be forgotten)", "category": "Rights"},
        "Art 18": {"name": "Right to restriction of processing", "category": "Rights"},
        "Art 19": {"name": "Notification obligation regarding rectification or erasure", "category": "Rights"},
        "Art 20": {"name": "Right to data portability", "category": "Rights"},
        "Art 21": {"name": "Right to object", "category": "Rights"},
        "Art 22": {"name": "Automated individual decision-making, including profiling", "category": "Rights"},
        "Art 25": {"name": "Data protection by design and by default", "category": "Design"},
        "Art 27": {"name": "Representatives of controllers or processors not established in the Union", "category": "Governance"},
        "Art 28": {"name": "Processor", "category": "Governance"},
        "Art 30": {"name": "Records of processing activities", "category": "Documentation"},
        "Art 32": {"name": "Security of processing", "category": "Security"},
        "Art 33": {"name": "Notification of a personal data breach", "category": "Breach"},
        "Art 34": {"name": "Communication of a personal data breach to the data subject", "category": "Breach"},
        "Art 35": {"name": "Data protection impact assessment", "category": "Assessment"},
        "Art 36": {"name": "Prior consultation", "category": "Assessment"},
        "Art 44": {"name": "General principle for transfers", "category": "Transfers"},
        "Art 45": {"name": "Transfers on the basis of an adequacy decision", "category": "Transfers"},
        "Art 46": {"name": "Transfers subject to appropriate safeguards", "category": "Transfers"},
        "Art 47": {"name": "Binding corporate rules", "category": "Transfers"},
    },
    "SOC 2 Type II": {
        "CC1": {"name": "Control Environment", "category": "Organization"},
        "CC2": {"name": "Communication and Information", "category": "Organization"},
        "CC3": {"name": "Risk Assessment", "category": "Risk"},
        "CC4": {"name": "Monitoring Activities", "category": "Monitoring"},
        "CC5": {"name": "Control Activities", "category": "Controls"},
        "CC6.1": {"name": "Logical Access Security", "category": "Access"},
        "CC6.2": {"name": "Authentication", "category": "Access"},
        "CC6.3": {"name": "Authorization", "category": "Access"},
        "CC6.4": {"name": "Access Approval", "category": "Access"},
        "CC6.5": {"name": "Access Revocation", "category": "Access"},
        "CC6.6": {"name": "Access Review", "category": "Access"},
        "CC6.7": {"name": "Boundary Protection", "category": "Network"},
        "CC6.8": {"name": "System Software", "category": "Systems"},
        "CC7.1": {"name": "System Operations Monitoring", "category": "Monitoring"},
        "CC7.2": {"name": "Incident Management", "category": "Incident"},
        "CC7.3": {"name": "Problem Management", "category": "Incident"},
        "CC7.4": {"name": "Data Management", "category": "Data"},
        "CC7.5": {"name": "Data Transmission", "category": "Data"},
        "CC8.1": {"name": "Change Management", "category": "Change"},
        "CC9.1": {"name": "Risk Assessment", "category": "Risk"},
    },
    "NIST CSF 2.0": {
        "GV.1": {"name": "Governance", "category": "Govern"},
        "GV.2": {"name": "Risk Management Strategy", "category": "Govern"},
        "ID.1": {"name": "Asset Inventory", "category": "Identify"},
        "ID.2": {"name": "Asset Classification", "category": "Identify"},
        "ID.3": {"name": "Asset Management", "category": "Identify"},
        "ID.4": {"name": "Asset Vulnerabilities", "category": "Identify"},
        "ID.5": {"name": "Risk Identification", "category": "Identify"},
        "ID.6": {"name": "Risk Assessment", "category": "Identify"},
        "ID.7": {"name": "Risk Response", "category": "Identify"},
        "ID.8": {"name": "Risk Mitigation", "category": "Identify"},
        "PR.1": {"name": "Access Control", "category": "Protect"},
        "PR.2": {"name": "Awareness and Training", "category": "Protect"},
        "PR.3": {"name": "Data Security", "category": "Protect"},
        "PR.4": {"name": "Information Protection Processes", "category": "Protect"},
        "PR.5": {"name": "Maintenance", "category": "Protect"},
        "PR.6": {"name": "Protective Technology", "category": "Protect"},
        "DE.1": {"name": "Anomalies and Events", "category": "Detect"},
        "DE.2": {"name": "Security Continuous Monitoring", "category": "Detect"},
        "DE.3": {"name": "Detection Processes", "category": "Detect"},
        "RS.1": {"name": "Response Planning", "category": "Respond"},
        "RS.2": {"name": "Response Processes", "category": "Respond"},
        "RS.3": {"name": "Response Analysis", "category": "Respond"},
        "RS.4": {"name": "Response Mitigation", "category": "Respond"},
        "RC.1": {"name": "Recovery Planning", "category": "Recover"},
        "RC.2": {"name": "Recovery Processes", "category": "Recover"},
        "RC.3": {"name": "Recovery Improvements", "category": "Recover"},
    },
}


# Prompt templates for the compliance agent
PROMPT_TEMPLATES = {
    "control_extraction": """
You are an expert cybersecurity consultant. Analyze the following policy document text and extract all security controls, requirements, and compliance statements.

Return a JSON array with each control having:
- "id": A unique identifier (e.g., "CTRL-1", "CTRL-2")
- "text": The exact or summarized control statement
- "category": The type of control (e.g., "Access Control", "Data Protection", "Network Security", "Encryption", "Audit", "Physical Security", "Policy")
- "confidence": A score from 0.5 to 1.0 indicating how certain you are this is a valid control

Text to analyze:
{text}

Return ONLY the JSON array, no other text.
""",
    
    "control_mapping": """
You are an expert compliance mapping specialist. Map the following extracted controls to the most relevant controls in these frameworks: ISO 27001:2022, GDPR, SOC 2 Type II, NIST CSF 2.0.

For each control, identify the best matching framework controls.

Extracted controls:
{controls}

Available framework controls will be provided in the context.

Return a JSON array with each control having:
- "control_id": The original control ID
- "mappings": Array of framework mappings, each with:
  - "framework": The framework name
  - "control_id": The specific control ID (e.g., "A.8.5", "Art 32", "CC6.1")
  - "requirement_text": The framework requirement text
  - "match_score": Confidence score from 0.0 to 1.0

Return ONLY the JSON array, no other text.
""",

    "gap_analysis": """
You are an expert compliance auditor. Perform a gap analysis comparing extracted controls against the following frameworks: ISO 27001:2022, GDPR, SOC 2 Type II.

Identify which framework requirements are NOT covered by the extracted controls.

Mapped controls:
{mapped_controls}

Return a JSON array of gaps, each with:
- "framework": The framework name
- "control_id": The missing control ID
- "requirement_text": What the requirement is
- "description": Explanation of the gap
- "severity": "High", "Medium", or "Low"

Return ONLY the JSON array, no other text.
""",

    "risk_assessment": """
You are an expert risk assessor. Analyze the identified compliance gaps and assess the risks.

Gaps:
{gaps}

Return a JSON array of risks, each with:
- "gap_index": Index of the gap this risk relates to
- "description": Description of the risk
- "likelihood": "High", "Medium", or "Low"
- "impact": "High", "Medium", or "Low"
- "risk_level": "Critical", "High", "Medium", or "Low"
- "category": Risk category (e.g., "Data Breach", "Compliance Violation", "Reputation")

Return ONLY the JSON array, no other text.
""",

    "recommendations": """
You are an expert compliance consultant. Generate actionable recommendations for the identified gaps and risks.

Gaps:
{gaps}

Risks:
{risks}

Return a JSON array of recommendations, each with:
- "title": Brief title of the recommendation
- "description": Detailed description of what needs to be done
- "priority": "Critical", "High", "Medium", or "Low"
- "action_items": Array of specific action items
- "estimated_effort": "Low", "Medium", or "High"
- "framework": The primary framework this addresses

Return ONLY the JSON array, no other text.
""",
}


def get_llm_config() -> LLMConfig:
    """Get the current LLM configuration."""
    return DEFAULT_CONFIG


def get_framework_controls() -> Dict[str, Dict]:
    """Get all framework controls."""
    return FRAMEWORK_CONTROLS


def get_prompt_template(template_name: str) -> str:
    """Get a prompt template by name."""
    return PROMPT_TEMPLATES.get(template_name, "")
