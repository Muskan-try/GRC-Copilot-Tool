import re
from typing import List, Dict
from loguru import logger

class ControlExtractor:
    """Extracts security/privacy controls from text using keywords and patterns."""

    KEYWORDS = [
        "shall", "must", "should", "ensure", "implement", "control", "policy",
        "protect", "secure", "monitor", "review", "approve", "authorize",
        "backup", "encrypt", "audit", "restrict", "limit", "prevent"
    ]

    # Patterns for numbered controls like (1), 1.1, [CTRL-1], etc.
    CONTROL_PATTERNS = [
        r'\[(CTRL|REQ)-\d+\]',           # [CTRL-1]
        r'^\d+\.\d+\s+',                 # 1.1 
        r'^\(\d+\)\s+',                  # (1)
        r'Control\s+\d+[:.]',            # Control 1:
        r'Requirement\s+\d+[:.]'         # Requirement 1:
    ]

    def extract(self, text: str) -> List[Dict]:
        logger.info("Extracting controls from text")
        # Split into lines first to catch line-based patterns
        lines = text.split('\n')
        extracted_controls = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            is_control = False
            confidence = 0.5
            
            # Check for patterns
            for pattern in self.CONTROL_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    is_control = True
                    confidence = 0.9
                    break
            
            # Check for keywords if not already found by pattern
            if not is_control:
                line_lower = line.lower()
                matches = [kw for kw in self.KEYWORDS if kw in line_lower]
                if len(matches) >= 2: # At least two keywords
                    is_control = True
                    confidence = 0.7
                elif len(matches) == 1 and len(line) < 200: # One keyword in a short sentence
                    is_control = True
                    confidence = 0.6

            if is_control:
                # Clean up the line (remove multiple spaces)
                clean_text = re.sub(r'\s+', ' ', line)
                extracted_controls.append({
                    "id": f"CTRL-{len(extracted_controls) + 1}",
                    "text": clean_text,
                    "confidence": confidence
                })
        
        # If no controls found with line-based scanning, try sentence-based
        if not extracted_controls:
            sentences = re.split(r'[.!?]\s+', text)
            for sentence in sentences:
                sentence = sentence.strip()
                if any(kw in sentence.lower() for kw in self.KEYWORDS):
                    extracted_controls.append({
                        "id": f"CTRL-{len(extracted_controls) + 1}",
                        "text": sentence,
                        "confidence": 0.6
                    })
        
        return extracted_controls

control_extractor = ControlExtractor()
