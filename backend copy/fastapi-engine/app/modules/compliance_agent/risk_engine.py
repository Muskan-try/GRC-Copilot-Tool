from typing import List, Dict
from loguru import logger

class RiskEngine:
    """Converts identified gaps into potential risks."""

    def identify_risks(self, gaps: List[Dict]) -> List[Dict]:
        logger.info("Identifying risks from gaps")
        risks = []
        
        for gap in gaps:
            risks.append({
                "id": f"RISK-{len(risks) + 1}",
                "gap_ref": gap["control_id"],
                "title": f"Risk of non-compliance: {gap['description']}",
                "impact": "High" if gap["framework"] == "GDPR" else "Medium",
                "likelihood": "Moderate",
                "framework": gap["framework"]
            })
            
        return risks

risk_engine = RiskEngine()
