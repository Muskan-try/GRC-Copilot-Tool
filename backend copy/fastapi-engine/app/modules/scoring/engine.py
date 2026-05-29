from loguru import logger

class ScoringEngine:
    """Core scoring engine for GRC assessments."""
    
    async def process_scores(self, responses: list):
        logger.info("Processing scores in engine")
        return {"overall": 0, "categories": {}}

engine = ScoringEngine()
