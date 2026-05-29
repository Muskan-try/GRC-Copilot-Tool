from typing import List, Dict
from loguru import logger

class RecommendationEngine:
    """Suggests remediation actions for identified gaps and risks."""

    def generate_recommendations(self, gaps: List[Dict]) -> List[Dict]:
        logger.info("Generating recommendations for gaps")
        recommendations = []
        
        for gap in gaps:
            recommendations.append({
                "id": f"REC-{len(recommendations) + 1}",
                "gap_ref": gap["control_id"],
                "action": f"Implement {gap['description']} as required by {gap['framework']}",
                "priority": "High" if gap["framework"] == "GDPR" else "Medium",
                "estimated_effort": "Medium"
            })
            
        return recommendations

recommendation_engine = RecommendationEngine()
