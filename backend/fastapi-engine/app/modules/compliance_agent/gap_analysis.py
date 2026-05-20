from typing import List, Dict
from .control_mapper import ControlMapper
from loguru import logger

class GapAnalysis:
    """Identifies missing controls based on the selected frameworks."""

    def perform_gap_analysis(self, mapped_controls: List[Dict]) -> List[Dict]:
        logger.info("Performing gap analysis")
        gaps = []
        
        # Collect all mapped framework control IDs
        found_controls = {fw: set() for fw in ControlMapper.FRAMEWORKS.keys()}
        for mc in mapped_controls:
            for mapping in mc.get("mappings", []):
                found_controls[mapping["framework"]].add(mapping["control_id"])
        
        # Compare with requirements
        for framework, requirements in ControlMapper.FRAMEWORKS.items():
            for req in requirements:
                if req["id"] not in found_controls[framework]:
                    gaps.append({
                        "framework": framework,
                        "control_id": req["id"],
                        "description": req["text"],
                        "status": "Missing"
                    })
        
        return gaps

gap_analysis = GapAnalysis()
