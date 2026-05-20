from typing import List, Dict
from loguru import logger

class ControlMapper:
    """Maps extracted controls to ISO 27001, GDPR, and SOC 2 frameworks."""

    FRAMEWORKS = {
        "ISO 27001:2022": [
            {"id": "A.5.1", "text": "Policies for information security", "keywords": ["policy", "security", "framework"]},
            {"id": "A.5.15", "text": "Identity management", "keywords": ["identity", "user", "identifier"]},
            {"id": "A.5.16", "text": "Authentication information", "keywords": ["password", "authentication", "credential"]},
            {"id": "A.8.1", "text": "User endpoint devices", "keywords": ["endpoint", "device", "mobile", "laptop"]},
            {"id": "A.8.10", "text": "Information deletion", "keywords": ["deletion", "disposal", "retention"]},
            {"id": "A.8.11", "text": "Data masking", "keywords": ["masking", "anonymization", "pseudonymization"]},
            {"id": "A.8.12", "text": "Data leakage prevention", "keywords": ["leakage", "dlp", "prevention"]},
            {"id": "A.8.13", "text": "Information backup", "keywords": ["backup", "restore", "recovery"]},
            {"id": "A.8.20", "text": "Network security", "keywords": ["network", "firewall", "router", "segmentation"]},
            {"id": "A.8.24", "text": "Use of cryptography", "keywords": ["cryptography", "encryption", "decryption"]},
            {"id": "A.8.5", "text": "Secure authentication", "keywords": ["mfa", "2fa", "authentication"]},
        ],
        "GDPR": [
            {"id": "Art 5", "text": "Principles relating to processing", "keywords": ["processing", "personal data", "lawfulness"]},
            {"id": "Art 13", "text": "Information to be provided", "keywords": ["disclosure", "notice", "transparency"]},
            {"id": "Art 15", "text": "Right of access by the data subject", "keywords": ["access", "subject", "request"]},
            {"id": "Art 17", "text": "Right to erasure ('right to be forgotten')", "keywords": ["erasure", "deletion", "forgotten"]},
            {"id": "Art 25", "text": "Data protection by design and by default", "keywords": ["design", "default", "privacy"]},
            {"id": "Art 32", "text": "Security of processing", "keywords": ["security", "processing", "technical", "organizational"]},
            {"id": "Art 33", "text": "Notification of a personal data breach", "keywords": ["breach", "notification", "incident"]},
            {"id": "Art 35", "text": "Data protection impact assessment", "keywords": ["impact", "assessment", "dpia"]},
        ],
        "SOC 2": [
            {"id": "CC6.1", "text": "Logical Access Security", "keywords": ["access", "logical", "authentication"]},
            {"id": "CC6.7", "text": "Boundary Protection", "keywords": ["boundary", "firewall", "network"]},
            {"id": "CC7.1", "text": "System Operations Monitoring", "keywords": ["monitoring", "logging", "alerting"]},
            {"id": "CC7.2", "text": "Incident Management", "keywords": ["incident", "response", "remediation"]},
            {"id": "CC8.1", "text": "Change Management", "keywords": ["change", "development", "testing"]},
            {"id": "CC9.1", "text": "Risk Assessment", "keywords": ["risk", "threat", "vulnerability"]},
        ]
    }

    def map_to_frameworks(self, extracted_controls: List[Dict]) -> List[Dict]:
        logger.info("Mapping extracted controls to frameworks")
        mapped_results = []
        
        for control in extracted_controls:
            mappings = []
            control_text_lower = control["text"].lower()
            
            for framework, requirements in self.FRAMEWORKS.items():
                for req in requirements:
                    # Check if any keyword matches
                    if any(keyword in control_text_lower for keyword in req["keywords"]):
                        # Calculate a simple match score
                        match_count = sum(1 for kw in req["keywords"] if kw in control_text_lower)
                        mappings.append({
                            "framework": framework,
                            "control_id": req["id"],
                            "requirement_text": req["text"],
                            "match_score": match_count / len(req["keywords"])
                        })
            
            # Sort mappings by score
            mappings.sort(key=lambda x: x["match_score"], reverse=True)
            
            mapped_results.append({
                **control,
                "mappings": mappings[:3] # Keep top 3 mappings
            })
            
        return mapped_results

control_mapper = ControlMapper()
