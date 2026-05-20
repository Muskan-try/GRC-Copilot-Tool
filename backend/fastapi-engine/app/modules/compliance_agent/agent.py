from .policy_parser import policy_parser
from .control_extractor import control_extractor
from .control_mapper import control_mapper
from .gap_analysis import gap_analysis
from .risk_engine import risk_engine
from .recommendation_engine import recommendation_engine
from ..ai_agent.ai_analyzer import AIComplianceAnalyzer
from loguru import logger
from datetime import datetime
import os

class ComplianceMappingAgent:
    """The main agent that orchestrates the entire compliance mapping process."""
    
    def __init__(self):
        self.ai_analyzer = AIComplianceAnalyzer(provider_type=os.getenv("LLM_PROVIDER", "groq"))

    async def run_assessment(self, file_content: bytes, filename: str):
        logger.info(f"Compliance Mapping Agent started for {filename}")
        
        # Check if we should use AI analysis
        use_ai = os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
        
        if use_ai:
            try:
                logger.info("Using AI-powered analysis")
                ai_result = await self.ai_analyzer.analyze_document_ai(file_content, filename)
                
                # Adapt AI result to expected schema for frontend
                # Gaps: rename 'control_name' to 'description' if needed by frontend
                gaps = []
                for g in ai_result.get("gaps", []):
                    gaps.append({
                        "framework": g.get("framework"),
                        "control_id": g.get("control_id"),
                        "description": g.get("control_name") or g.get("description"),
                        "status": g.get("status", "Missing")
                    })
                
                # Recommendations: rename fields to match frontend expectations
                recommendations = []
                for i, r in enumerate(ai_result.get("recommendations", [])):
                    recommendations.append({
                        "id": r.get("id") or f"REC-{i+1}",
                        "gap_ref": r.get("gap_ref"),
                        "action": r.get("title") or r.get("description"),
                        "priority": r.get("priority", "Medium"),
                        "estimated_effort": r.get("effort") or r.get("estimated_effort", "Medium")
                    })
                
                return {
                    "metadata": ai_result.get("metadata"),
                    "controls_found": ai_result.get("controls_found"),
                    "mapped_controls": ai_result.get("mapped_controls"),
                    "gaps": gaps,
                    "risks": ai_result.get("risks"),
                    "recommendations": recommendations,
                    "status": "complete",
                    "method": "ai_powered"
                }
            except Exception as e:
                logger.error(f"AI analysis failed, falling back to rule-based: {e}")
        
        # Fallback to rule-based logic
        logger.info("Using rule-based analysis")
        # 1. Parse policy text
        policy_text = policy_parser.parse(file_content, filename)
        
        # 2. Extract controls
        extracted_controls = control_extractor.extract(policy_text)
        
        # 3. Map controls to frameworks
        mapped_controls = control_mapper.map_to_frameworks(extracted_controls)
        
        # 4. Perform gap analysis
        gaps = gap_analysis.perform_gap_analysis(mapped_controls)
        
        # 5. Identify risks
        risks = risk_engine.identify_risks(gaps)
        
        # 6. Generate recommendations
        recommendations = recommendation_engine.generate_recommendations(gaps)
        
        # Calculate some stats
        total_controls = len(extracted_controls)
        mapped_count = sum(1 for c in mapped_controls if c.get("mappings"))
        
        return {
            "metadata": {
                "filename": filename,
                "timestamp": datetime.utcnow().isoformat(),
                "total_controls_found": total_controls,
                "mapped_controls_count": mapped_count,
                "unmapped_controls_count": total_controls - mapped_count,
                "total_gaps": len(gaps),
                "total_risks": len(risks)
            },
            "controls_found": extracted_controls,
            "mapped_controls": mapped_controls,
            "gaps": gaps,
            "risks": risks,
            "recommendations": recommendations,
            "status": "complete",
            "method": "rule_based"
        }

agent = ComplianceMappingAgent()
