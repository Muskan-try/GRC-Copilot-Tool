"""
AI Compliance Analyzer - Core LLM-powered analysis engine
Uses DeepSeek, OpenAI, or other LLM providers for intelligent compliance analysis
"""

import os
import json
import hashlib
import httpx
from typing import Optional, Dict, List, Any
from loguru import logger
from datetime import datetime


class LLMProvider:
    """Base class for LLM provider integrations"""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, 
                 api_url: Optional[str] = None, timeout: int = 30):
        self.api_key = api_key or self.get_api_key_from_env()
        self.model = model or self.get_default_model()
        self.api_url = api_url or self.get_default_url()
        self.timeout = timeout
        self.client = httpx.AsyncClient(timeout=timeout)
    
    def get_api_key_from_env(self) -> str:
        """Override in subclasses"""
        return ""
    
    def get_default_model(self) -> str:
        """Override in subclasses"""
        return ""
    
    def get_default_url(self) -> str:
        """Override in subclasses"""
        return ""
    
    async def chat_completion(self, messages: List[Dict], temperature: float = 0.7, 
                             max_tokens: int = 2000, json_mode: bool = False,
                             seed: int = 42) -> Optional[str]:
        """Send chat completion request to LLM"""
        raise NotImplementedError
    
    async def close(self):
        await self.client.aclose()


class DeepSeekProvider(LLMProvider):
    """DeepSeek API provider"""
    
    def get_api_key_from_env(self) -> str:
        return os.getenv("DEEPSEEK_API_KEY", "")
    
    def get_default_model(self) -> str:
        return os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    
    def get_default_url(self) -> str:
        return os.getenv("DEEPSEEK_API_URL", "https://api.deepseek.com/v1/chat/completions")
    
    async def chat_completion(self, messages: List[Dict], temperature: float = 0.7,
                             max_tokens: int = 2000, json_mode: bool = False,
                             seed: int = 42) -> Optional[str]:
        if not self.api_key:
            logger.error("DeepSeek API key is missing or not configured.")
            return None
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "seed": seed,
            }
            
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            
            response = await self.client.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                json=payload
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", None)
            
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            return None


class OpenAIProvider(LLMProvider):
    """OpenAI API provider"""
    
    def get_api_key_from_env(self) -> str:
        return os.getenv("OPENAI_API_KEY", "")
    
    def get_default_model(self) -> str:
        return os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    def get_default_url(self) -> str:
        return os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")
    
    async def chat_completion(self, messages: List[Dict], temperature: float = 0.7,
                             max_tokens: int = 2000, json_mode: bool = False,
                             seed: int = 42) -> Optional[str]:
        if not self.api_key:
            logger.error("OpenAI API key is missing or not configured.")
            return None
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "seed": seed,
            }
            
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            
            response = await self.client.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                json=payload
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", None)
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return None


class GroqProvider(LLMProvider):
    """Groq API provider"""
    
    def get_api_key_from_env(self) -> str:
        return os.getenv("GROQ_API_KEY", "")
    
    def get_default_model(self) -> str:
        return os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    def get_default_url(self) -> str:
        return os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
    
    async def chat_completion(self, messages: List[Dict], temperature: float = 0.7,
                             max_tokens: int = 2000, json_mode: bool = False,
                             seed: int = 42) -> Optional[str]:
        if not self.api_key:
            logger.error("Groq API key is missing or not configured.")
            return None
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "seed": seed,
            }
            
            if json_mode:
                payload["response_format"] = {"type": "json_object"}
            
            response = await self.client.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                json=payload
            )
            
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", None)
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return None


class LLMFactory:
    """Factory to create LLM provider instances"""
    
    @staticmethod
    def create_provider(provider_type: str = "groq") -> LLMProvider:
        """Create an LLM provider based on type"""
        providers = {
            "deepseek": DeepSeekProvider,
            "openai": OpenAIProvider,
            "groq": GroqProvider,
        }
        
        provider_class = providers.get(provider_type.lower(), GroqProvider)
        return provider_class()


class AIComplianceAnalyzer:
    """
    Main AI-powered compliance analyzer
    Uses LLM to perform intelligent analysis of policy documents
    """
    
    # Framework definitions for reference
    FRAMEWORKS = {
        "ISO 27001:2022": {
            "A.5": "Information security policies",
            "A.6": "Organization of information security",
            "A.7": "Human resource security",
            "A.8": "Asset management",
            "A.9": "Access control",
            "A.10": "Cryptography",
            "A.11": "Physical and environmental security",
            "A.12": "Operations security",
            "A.13": "Communications security",
            "A.14": "System acquisition, development and maintenance",
            "A.15": "Supplier relationships",
            "A.16": "Information security incident management",
            "A.17": "Information security aspects of business continuity management",
            "A.18": "Compliance",
        },
        "GDPR": {
            "Art 5": "Principles relating to processing of personal data",
            "Art 6": "Lawfulness of processing",
            "Art 13": "Information to be provided where personal data are collected from the data subject",
            "Art 15": "Right of access by the data subject",
            "Art 17": "Right to erasure (right to be forgotten)",
            "Art 25": "Data protection by design and by default",
            "Art 32": "Security of processing",
            "Art 33": "Notification of a personal data breach",
            "Art 35": "Data protection impact assessment",
        },
        "SOC 2": {
            "CC6.1": "Logical Access Security",
            "CC6.2": "Authentication and Authorization",
            "CC6.6": "Data Transmission Protection",
            "CC6.7": "Boundary Protection",
            "CC7.1": "System Operations Monitoring",
            "CC7.2": "Incident Management",
            "CC7.3": "Problem Management",
            "CC8.1": "Change Management",
            "CC9.1": "Risk Assessment",
        },
        "NIST CSF": {
            "ID": "Identify",
            "PR": "Protect",
            "DE": "Detect",
            "RS": "Respond",
            "RC": "Recover",
        }
    }
    
    def __init__(self, provider_type: str = "deepseek"):
        self.provider = LLMFactory.create_provider(provider_type)
        self.framework_details = self._load_framework_details()
    
    def _load_framework_details(self) -> Dict:
        """Load detailed framework information for mapping"""
        return {
            "ISO 27001:2022": {
                "controls": {
                    "A.5.1": {"name": "Information security policies and topic-specific policies", "keywords": ["policy", "security", "framework", "governance"]},
                    "A.5.2": {"name": "Information security roles and responsibilities", "keywords": ["roles", "responsibilities", "ownership", "accountability"]},
                    "A.5.15": {"name": "Identity management", "keywords": ["identity", "user", "identifier", "provisioning", "deprovisioning"]},
                    "A.5.16": {"name": "Authentication information", "keywords": ["password", "authentication", "credential", "MFA", "2FA"]},
                    "A.8.1": {"name": "User endpoint devices", "keywords": ["endpoint", "device", "mobile", "laptop", "workstation"]},
                    "A.8.10": {"name": "Information deletion", "keywords": ["deletion", "disposal", "retention", "purging"]},
                    "A.8.11": {"name": "Data masking", "keywords": ["masking", "anonymization", "pseudonymization", "obfuscation"]},
                    "A.8.12": {"name": "Data leakage prevention", "keywords": ["leakage", "DLP", "prevention", "exfiltration"]},
                    "A.8.13": {"name": "Information backup", "keywords": ["backup", "restore", "recovery", "disaster recovery"]},
                    "A.8.20": {"name": "Network security", "keywords": ["network", "firewall", "router", "segmentation", "DMZ"]},
                    "A.8.24": {"name": "Use of cryptography", "keywords": ["cryptography", "encryption", "decryption", "AES", "RSA"]},
                    "A.8.5": {"name": "Secure authentication", "keywords": ["MFA", "2FA", "authentication", "biometric", "token"]},
                    "A.12.1": {"name": "Operational procedures and responsibilities", "keywords": ["procedures", "operations", "responsibilities", "SOP"]},
                    "A.12.4": {"name": "Logging and monitoring", "keywords": ["logging", "monitoring", "audit", "SIEM", "alerts"]},
                    "A.13.1": {"name": "Network controls", "keywords": ["network", "controls", "firewall", "IDS", "IPS"]},
                    "A.16.1": {"name": "Responsibilities and procedures", "keywords": ["incident", "response", "procedures", "escalation"]},
                    "A.18.1": {"name": "Compliance with legal and contractual requirements", "keywords": ["compliance", "legal", "contractual", "regulatory"]},
                }
            },
            "GDPR": {
                "controls": {
                    "Art 5": {"name": "Principles relating to processing", "keywords": ["processing", "personal data", "lawfulness", "fairness", "transparency"]},
                    "Art 6": {"name": "Lawfulness of processing", "keywords": ["lawful", "consent", "contract", "legal obligation", "vital interests"]},
                    "Art 13": {"name": "Information to be provided", "keywords": ["disclosure", "notice", "transparency", "privacy policy"]},
                    "Art 15": {"name": "Right of access", "keywords": ["access", "subject", "request", "DSAR", "data subject rights"]},
                    "Art 17": {"name": "Right to erasure", "keywords": ["erasure", "deletion", "forgotten", "right to be forgotten"]},
                    "Art 25": {"name": "Data protection by design and default", "keywords": ["design", "default", "privacy by design", "minimization"]},
                    "Art 32": {"name": "Security of processing", "keywords": ["security", "processing", "technical", "organizational", "measures"]},
                    "Art 33": {"name": "Notification of data breach", "keywords": ["breach", "notification", "incident", "72 hours"]},
                    "Art 35": {"name": "Data protection impact assessment", "keywords": ["impact", "assessment", "DPIA", "high risk"]},
                }
            },
            "SOC 2": {
                "controls": {
                    "CC6.1": {"name": "Logical Access Security", "keywords": ["access", "logical", "authentication", "authorization", "RBAC"]},
                    "CC6.2": {"name": "Authentication and Authorization", "keywords": ["authentication", "authorization", "MFA", "credentials", "permissions"]},
                    "CC6.6": {"name": "Data Transmission Protection", "keywords": ["transmission", "encryption", "TLS", "SSL", "in transit"]},
                    "CC6.7": {"name": "Boundary Protection", "keywords": ["boundary", "firewall", "network", "DMZ", "perimeter"]},
                    "CC7.1": {"name": "System Operations Monitoring", "keywords": ["monitoring", "logging", "alerting", "SIEM", "observability"]},
                    "CC7.2": {"name": "Incident Management", "keywords": ["incident", "response", "remediation", "escalation", "IRP"]},
                    "CC7.3": {"name": "Problem Management", "keywords": ["problem", "root cause", "analysis", "prevention"]},
                    "CC8.1": {"name": "Change Management", "keywords": ["change", "development", "testing", "deployment", "rollout"]},
                    "CC9.1": {"name": "Risk Assessment", "keywords": ["risk", "threat", "vulnerability", "assessment", "mitigation"]},
                }
            }
        }
    
    async def extract_controls_ai(self, policy_text: str, filename: str) -> List[Dict]:
        """
        Use AI to intelligently extract security controls from policy text
        Returns structured control data with confidence scores
        """
        system_prompt = """You are an expert GRC (Governance, Risk, and Compliance) analyst specializing in security controls extraction.
Your task is to identify and extract security/privacy controls from the provided policy document text.

INSTRUCTIONS:
- Extract ALL security, privacy, and compliance controls mentioned in the text
- Each control should be a specific, actionable requirement or safeguard
- Include the exact text from the document for each control
- Assign a confidence score (0.0-1.0) based on how clearly it's stated as a control
- Categorize each control by type: access_control, data_protection, monitoring, governance, network, incident_response, etc.
- Identify the framework it likely belongs to if obvious (ISO 27001, GDPR, SOC 2, etc.)
- Return ONLY valid JSON matching the exact structure below

RESPONSE FORMAT (strict JSON only, no other text):
{
  "controls": [
    {
      "id": "CTRL-1",
      "text": "The exact control text from the document",
      "category": "access_control",
      "confidence": 0.95,
      "framework_hint": "ISO 27001",
      "control_type": "requirement|safeguard|procedure|policy"
    }
  ],
  "summary": {
    "total_controls": 10,
    "by_category": {"access_control": 3, "data_protection": 2, ...},
    "by_framework": {"ISO 27001": 5, "GDPR": 2, ...}
  }
}

IMPORTANT: Be thorough. A typical security policy has 20-100+ controls. Extract them ALL."""

        user_prompt = f"""Extract all security controls from this policy document:

Filename: {filename}

Policy Text:
{policy_text[:12000]}

{'(Text truncated - continue with remaining content)' if len(policy_text) > 12000 else ''}

Return comprehensive controls extraction in JSON format."""

        try:
            result = await self.provider.chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=4000,
                json_mode=True
            )
            
            if result:
                data = json.loads(result)
                return data.get("controls", [])
            
        except (json.JSONDecodeError, Exception) as e:
            logger.error(f"AI control extraction failed: {e}")
        
        # Fallback to basic extraction
        return await self._fallback_extract_controls(policy_text)
    
    async def _fallback_extract_controls(self, policy_text: str) -> List[Dict]:
        """Fallback control extraction using basic patterns"""
        import re
        
        controls = []
        lines = policy_text.split('\n')
        
        # Pattern for numbered controls
        control_patterns = [
            r'\d+\.\d+\s+.*',  # 1.1 Control text
            r'\(\d+\)\s+.*',   # (1) Control text
            r'\[(CTRL|REQ|CONTROL)-\d+\]\s*.*',  # [CTRL-1] Control text
            r'Control\s+\d+[:.]\s*.*',  # Control 1: text
        ]
        
        keywords = [
            "shall", "must", "should", "ensure", "implement", "maintain",
            "require", "mandate", "policy", "procedure", "control", "protect",
            "secure", "monitor", "review", "audit", "authorize", "approve"
        ]
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check patterns
            is_control = any(re.match(p, line, re.IGNORECASE) for p in control_patterns)
            
            # Check keywords
            if not is_control:
                line_lower = line.lower()
                kw_matches = sum(1 for kw in keywords if kw in line_lower)
                if kw_matches >= 2 or (kw_matches >= 1 and len(line) < 200):
                    is_control = True
            
            if is_control:
                controls.append({
                    "id": f"CTRL-{len(controls) + 1}",
                    "text": line[:500],
                    "category": "general",
                    "confidence": 0.7,
                    "framework_hint": None,
                    "control_type": "requirement"
                })
        
        return controls
    
    async def map_controls_to_frameworks_ai(self, controls: List[Dict], 
                                         target_frameworks: Optional[List[str]] = None) -> List[Dict]:
        """
        Use AI to intelligently map extracted controls to compliance frameworks
        """
        if not controls:
            return []
        
        target_fw = target_frameworks or ["ISO 27001:2022", "GDPR", "SOC 2"]
        
        # Prepare framework context
        fw_context = "\n".join([
            f"{fw}: {json.dumps(self.framework_details.get(fw, {}).get('controls', {}))}"
            for fw in target_fw
        ])
        
        # Batch controls for efficiency
        batch_size = 10
        mapped_results = []
        
        for i in range(0, len(controls), batch_size):
            batch = controls[i:i + batch_size]
            batch_mappings = await self._map_batch_to_frameworks(batch, target_fw, fw_context)
            mapped_results.extend(batch_mappings)
        
        return mapped_results
    
    async def _map_batch_to_frameworks(self, controls: List[Dict], 
                                      target_frameworks: List[str], 
                                      fw_context: str) -> List[Dict]:
        """Map a batch of controls to frameworks using AI"""
        system_prompt = """You are an expert GRC analyst specializing in compliance framework mapping.
Your task is to map extracted security controls to the most relevant compliance framework requirements.

INSTRUCTIONS:
- For each control, identify which framework requirements it satisfies
- Match to the MOST specific and relevant control/requirement
- Provide a match score (0.0-1.0) indicating confidence in the mapping
- Include a brief justification for each mapping
- Consider partial matches (score 0.3-0.7) and exact matches (score 0.8-1.0)
- A control can map to multiple frameworks

FRAMEWORK CONTROLS AVAILABLE:
""" + fw_context + """

RESPONSE FORMAT (strict JSON only):
{
  "mappings": [
    {
      "control_id": "CTRL-1",
      "control_text": "The control text",
      "mappings": [
        {
          "framework": "ISO 27001:2022",
          "control_id": "A.5.1",
          "control_name": "Information security policies",
          "match_score": 0.95,
          "justification": "This control directly addresses the requirement for information security policies"
        }
      ]
    }
  ]
}

Be thorough and accurate. Even partial matches are valuable."""

        controls_text = "\n".join([
            f"Control {c['id']}: {c.get('text', '')[:500]}"
            for c in controls
        ])
        
        user_prompt = f"""Map these controls to the most relevant framework requirements:

Target Frameworks: {', '.join(target_frameworks)}

Controls:
{controls_text}

Return mappings in JSON format."""

        try:
            result = await self.provider.chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=4000,
                json_mode=True
            )
            
            if result:
                data = json.loads(result)
                return data.get("mappings", [])
            
        except Exception as e:
            logger.error(f"AI framework mapping failed: {e}")
        
        # Fallback to keyword-based mapping
        return await self._fallback_map_controls(controls, target_frameworks)
    
    async def _fallback_map_controls(self, controls: List[Dict], 
                                      target_frameworks: List[str]) -> List[Dict]:
        """Fallback to keyword-based mapping"""
        mapped = []
        
        for control in controls:
            mappings = []
            control_text = control.get("text", "").lower()
            
            for fw in target_frameworks:
                if fw in self.framework_details:
                    for ctrl_id, ctrl_info in self.framework_details[fw]["controls"].items():
                        keywords = ctrl_info.get("keywords", [])
                        match_count = sum(1 for kw in keywords if kw in control_text)
                        
                        if match_count > 0:
                            score = min(1.0, match_count / len(keywords) + 0.3)
                            mappings.append({
                                "framework": fw,
                                "control_id": ctrl_id,
                                "control_name": ctrl_info["name"],
                                "match_score": round(score, 2),
                                "justification": f"Matched {match_count} keywords"
                            })
            
            # Sort by score
            mappings.sort(key=lambda x: x["match_score"], reverse=True)
            
            mapped.append({
                **control,
                "mappings": mappings[:5]  # Top 5 mappings
            })
        
        return mapped
    
    async def perform_gap_analysis_ai(self, mapped_controls: List[Dict], 
                                     target_frameworks: List[str]) -> List[Dict]:
        """
        Use AI to identify gaps in compliance coverage
        """
        system_prompt = """You are an expert GRC analyst specializing in gap analysis.
Your task is to identify missing controls/requirements based on a comprehensive framework baseline.

INSTRUCTIONS:
- Compare the mapped controls against each framework's complete requirements
- Identify which framework controls/requirements are NOT covered by the mapped controls
- For each gap, explain what's missing and why it's important
- Assign a risk level (Low, Medium, High, Critical) based on the importance of the missing control
- Suggest the type of evidence that would be needed to close the gap

RESPONSE FORMAT (strict JSON only):
{
  "gaps": [
    {
      "framework": "ISO 27001:2022",
      "control_id": "A.5.2",
      "control_name": "Information security roles and responsibilities",
      "status": "Missing",
      "risk_level": "High",
      "importance": "Defines accountability for information security",
      "evidence_required": "Organizational chart showing security roles, RACI matrix",
      "recommendation": "Define and document information security roles and responsibilities"
    }
  ],
  "summary": {
    "total_gaps": 15,
    "by_framework": {"ISO 27001:2022": 8, "GDPR": 4, "SOC 2": 3},
    "by_risk_level": {"Critical": 2, "High": 5, "Medium": 6, "Low": 2}
  }
}

Be thorough. A typical gap analysis identifies 10-30 gaps depending on the organization's maturity."""

        # Build context of what's covered
        covered = {}
        for mc in mapped_controls:
            for mapping in mc.get("mappings", []):
                fw = mapping.get("framework", "")
                ctrl_id = mapping.get("control_id", "")
                if fw not in covered:
                    covered[fw] = set()
                covered[fw].add(ctrl_id)
        
        covered_text = "\n".join([
            f"{fw}: {', '.join(sorted(ctrls))}"
            for fw, ctrls in covered.items()
        ])
        
        user_prompt = f"""Perform gap analysis for these frameworks against the covered controls:

Target Frameworks: {', '.join(target_frameworks)}

Covered Controls (already mapped):
{covered_text if covered_text else 'No controls mapped yet'}

All Available Framework Controls:
""" + json.dumps({
            fw: list(self.framework_details.get(fw, {}).get('controls', {}).keys())
            for fw in target_frameworks
        }, indent=2) + """

Return gaps in JSON format."""

        try:
            result = await self.provider.chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=4000,
                json_mode=True
            )
            
            if result:
                data = json.loads(result)
                return data.get("gaps", [])
            
        except Exception as e:
            logger.error(f"AI gap analysis failed: {e}")
        
        # Fallback to basic gap analysis
        return await self._fallback_gap_analysis(mapped_controls, target_frameworks)
    
    async def _fallback_gap_analysis(self, mapped_controls: List[Dict], 
                                     target_frameworks: List[str]) -> List[Dict]:
        """Fallback gap analysis"""
        gaps = []
        
        # Collect all covered control IDs
        covered = {}
        for mc in mapped_controls:
            for mapping in mc.get("mappings", []):
                fw = mapping.get("framework", "")
                ctrl_id = mapping.get("control_id", "")
                if fw not in covered:
                    covered[fw] = set()
                covered[fw].add(ctrl_id)
        
        # Find missing controls
        for fw in target_frameworks:
            if fw in self.framework_details:
                for ctrl_id, ctrl_info in self.framework_details[fw]["controls"].items():
                    if ctrl_id not in covered.get(fw, set()):
                        risk = "High" if any(kw in ctrl_id for kw in ["A.5", "Art 5", "Art 32", "CC6.1"]) else "Medium"
                        gaps.append({
                            "framework": fw,
                            "control_id": ctrl_id,
                            "control_name": ctrl_info["name"],
                            "status": "Missing",
                            "risk_level": risk,
                            "importance": ctrl_info.get("description", "Important control"),
                            "evidence_required": "Documentation or implementation evidence",
                            "recommendation": f"Implement {ctrl_info['name']} as per {fw} requirements"
                        })
        
        return gaps
    
    async def identify_risks_ai(self, gaps: List[Dict], mapped_controls: List[Dict]) -> List[Dict]:
        """
        Use AI to identify and assess risks based on gaps and controls
        """
        system_prompt = """You are an expert GRC risk analyst.
Your task is to identify and assess risks based on compliance gaps and current controls.

INSTRUCTIONS:
- For each gap, identify the specific risk(s) it creates
- Assess risk based on: impact (Low/Medium/High/Critical) and likelihood (Low/Medium/High)
- Calculate overall risk score (1-10, where 10 is highest risk)
- Identify affected assets/data
- Suggest mitigation strategies with priority levels

RESPONSE FORMAT (strict JSON only):
{
  "risks": [
    {
      "id": "RISK-1",
      "title": "Risk of unauthorized access due to missing identity management",
      "description": "Without proper identity management controls, unauthorized users may gain access",
      "framework": "ISO 27001:2022",
      "gap_ref": "A.5.15",
      "impact": "High",
      "likelihood": "Medium",
      "risk_score": 7,
      "affected_assets": ["User accounts", "Sensitive data", "Systems"],
      "mitigation": "Implement identity management controls as per ISO 27001 A.5.15",
      "priority": "Critical",
      "estimated_cost_to_fix": "10000-50000"
    }
  ],
  "summary": {
    "total_risks": 10,
    "avg_risk_score": 6.5,
    "by_severity": {"Critical": 3, "High": 4, "Medium": 2, "Low": 1}
  }
}

Consider regulatory requirements, data sensitivity, and business impact in your assessment."""

        gaps_text = "\n".join([
            f"Gap {i+1}: [{g['framework']}] {g['control_id']} - {g['control_name']} ({g['risk_level']} risk)"
            for i, g in enumerate(gaps[:20])  # Limit to first 20 for context
        ])
        
        controls_summary = f"Total mapped controls: {len(mapped_controls)}"
        
        user_prompt = f"""Identify risks based on these compliance gaps:

Gaps Identified:
{gaps_text if gaps_text else 'No gaps identified'}

Current State:
{controls_summary}

Return risks in JSON format."""

        try:
            result = await self.provider.chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=4000,
                json_mode=True
            )
            
            if result:
                data = json.loads(result)
                return data.get("risks", [])
            
        except Exception as e:
            logger.error(f"AI risk identification failed: {e}")
        
        # Fallback to basic risk identification
        return await self._fallback_identify_risks(gaps)
    
    async def _fallback_identify_risks(self, gaps: List[Dict]) -> List[Dict]:
        """Fallback risk identification"""
        risks = []
        for i, gap in enumerate(gaps):
            impact = "High" if gap.get("risk_level") == "Critical" else gap.get("risk_level", "Medium")
            likelihood = "Medium"
            
            # Estimate risk score
            score_map = {"Critical": 9, "High": 7, "Medium": 5, "Low": 3}
            risk_score = score_map.get(gap.get("risk_level"), 5)
            
            risks.append({
                "id": f"RISK-{i+1}",
                "title": f"Risk of non-compliance: {gap['control_name']}",
                "description": f"Missing control {gap['control_id']} from {gap['framework']} creates compliance gap",
                "framework": gap["framework"],
                "gap_ref": gap["control_id"],
                "impact": impact,
                "likelihood": likelihood,
                "risk_score": risk_score,
                "affected_assets": ["Compliance status", "Audit readiness"],
                "mitigation": f"Implement {gap['control_name']} as per {gap['framework']}",
                "priority": gap.get("risk_level", "Medium"),
                "estimated_cost_to_fix": "10000-50000"
            })
        
        return risks
    
    async def generate_recommendations_ai(self, gaps: List[Dict], risks: List[Dict], 
                                         organization_context: Optional[Dict] = None) -> List[Dict]:
        """
        Use AI to generate actionable, context-aware recommendations
        """
        system_prompt = """You are an expert GRC consultant.
Your task is to generate actionable, prioritized recommendations to address compliance gaps and risks.

INSTRUCTIONS:
- For each gap and risk, create specific, actionable recommendations
- Prioritize based on: risk level, regulatory requirements, business impact
- Include estimated effort (Low/Medium/High) and timeline
- Provide cost estimates if possible
- Group related recommendations into initiatives
- Consider the organization's size, industry, and current maturity

RESPONSE FORMAT (strict JSON only):
{
  "recommendations": [
    {
      "id": "REC-1",
      "title": "Implement Identity and Access Management (IAM) System",
      "description": "Deploy a comprehensive IAM solution to manage user identities and access rights",
      "gap_ref": ["A.5.15", "A.9.1"],
      "risk_ref": ["RISK-1", "RISK-2"],
      "priority": "Critical",
      "effort": "High",
      "timeline": "3-6 months",
      "estimated_cost_usd": 50000,
      "owner": "IT Security Team",
      "success_metrics": "100% of users have proper access controls, 0 unauthorized access incidents",
      "depends_on": [],
      "type": "technical_implementation"
    }
  ],
  "summary": {
    "total_recommendations": 15,
    "estimated_total_cost_usd": 500000,
    "estimated_timeline": "6-12 months",
    "by_priority": {"Critical": 5, "High": 7, "Medium": 3, "Low": 0}
  }
}

Be specific, practical, and business-focused. Consider quick wins vs. strategic initiatives."""

        org_context = organization_context or {}
        org_text = f"""Organization Context:
- Industry: {org_context.get('industry', 'General')}
- Size: {org_context.get('size', 'Medium')}
- Current Maturity: {org_context.get('maturity', 'Developing')}
- Budget: {org_context.get('budget', '$100K-$500K')}
- Location: {org_context.get('location', 'Global')}"""
        
        gaps_summary = "\n".join([
            f"- {g['framework']} {g['control_id']}: {g['control_name']} ({g['risk_level']})"
            for g in gaps[:15]
        ])
        
        risks_summary = "\n".join([
            f"- {r['title']} (Score: {r['risk_score']}/10, {r['priority']})"
            for r in risks[:10]
        ])
        
        user_prompt = f"""Generate recommendations for these gaps and risks:

{org_text}

Gaps to Address:
{gaps_summary if gaps_summary else 'No gaps identified'}

Risks to Mitigate:
{risks_summary if risks_summary else 'No risks identified'}

Return recommendations in JSON format."""

        try:
            result = await self.provider.chat_completion(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
                max_tokens=4000,
                json_mode=True
            )
            
            if result:
                data = json.loads(result)
                return data.get("recommendations", [])
            
        except Exception as e:
            logger.error(f"AI recommendation generation failed: {e}")
        
        # Fallback to basic recommendations
        return await self._fallback_generate_recommendations(gaps, risks)
    
    async def _fallback_generate_recommendations(self, gaps: List[Dict], 
                                                  risks: List[Dict]) -> List[Dict]:
        """Fallback recommendation generation"""
        recommendations = []
        
        for i, gap in enumerate(gaps):
            priority = gap.get("risk_level", "Medium")
            effort_map = {"Critical": "High", "High": "High", "Medium": "Medium", "Low": "Low"}
            
            recommendations.append({
                "id": f"REC-{i+1}",
                "title": f"Implement {gap['control_name']}",
                "description": f"Implement {gap['control_id']} from {gap['framework']} to close the compliance gap",
                "gap_ref": [gap["control_id"]],
                "risk_ref": [f"RISK-{i+1}"],
                "priority": priority,
                "effort": effort_map.get(priority, "Medium"),
                "timeline": "1-3 months",
                "estimated_cost_usd": 10000,
                "owner": "Compliance Team",
                "success_metrics": f"Control {gap['control_id']} fully implemented and documented",
                "depends_on": [],
                "type": "compliance_implementation"
            })
        
        return recommendations
    
    async def analyze_document_ai(self, file_content: bytes, filename: str,
                                  organization_context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Complete AI-powered compliance analysis of a document
        This is the main entry point for the AI agent
        """
        from ..compliance_agent.policy_parser import policy_parser
        
        logger.info(f"AI Agent: Starting analysis for {filename}")
        
        # Step 1: Parse document
        policy_text = policy_parser.parse(file_content, filename)
        logger.info(f"AI Agent: Document parsed ({len(policy_text)} characters)")
        
        # Step 2: Extract controls using AI
        extracted_controls = await self.extract_controls_ai(policy_text, filename)
        logger.info(f"AI Agent: Extracted {len(extracted_controls)} controls")
        
        # Step 3: Map to frameworks
        target_frameworks = ["ISO 27001:2022", "GDPR", "SOC 2"]
        mapped_controls = await self.map_controls_to_frameworks_ai(extracted_controls, target_frameworks)
        logger.info(f"AI Agent: Mapped controls to frameworks")
        
        # Step 4: Gap analysis
        gaps = await self.perform_gap_analysis_ai(mapped_controls, target_frameworks)
        logger.info(f"AI Agent: Identified {len(gaps)} gaps")
        
        # Step 5: Risk assessment
        risks = await self.identify_risks_ai(gaps, mapped_controls)
        logger.info(f"AI Agent: Identified {len(risks)} risks")
        
        # Step 6: Generate recommendations
        recommendations = await self.generate_recommendations_ai(gaps, risks, organization_context)
        logger.info(f"AI Agent: Generated {len(recommendations)} recommendations")
        
        # Calculate stats
        total_controls = len(extracted_controls)
        mapped_count = sum(1 for c in mapped_controls if c.get("mappings"))
        
        result = {
            "metadata": {
                "filename": filename,
                "timestamp": datetime.utcnow().isoformat(),
                "analysis_method": "ai_powered",
                "total_controls_found": total_controls,
                "mapped_controls_count": mapped_count,
                "unmapped_controls_count": total_controls - mapped_count,
                "total_gaps": len(gaps),
                "total_risks": len(risks),
                "total_recommendations": len(recommendations),
                "frameworks_analyzed": target_frameworks
            },
            "controls_found": extracted_controls,
            "mapped_controls": mapped_controls,
            "gaps": gaps,
            "risks": risks,
            "recommendations": recommendations,
            "status": "complete",
            "ai_analysis": {
                "model_used": self.provider.model,
                "provider": self.provider.__class__.__name__,
                "confidence_note": "AI-powered analysis with reasoning capabilities"
            }
        }
        
        logger.info(f"AI Agent: Analysis complete for {filename}")
        return result
    
    async def close(self):
        await self.provider.close()
