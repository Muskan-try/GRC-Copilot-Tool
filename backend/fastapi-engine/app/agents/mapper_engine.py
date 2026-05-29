import os
from typing import List, Any
from pydantic import BaseModel, Field
import chromadb
from chromadb.utils import embedding_functions

# Establish persistent database tracking connection
# Try multiple paths to ensure it works in both Local and Docker environments
possible_paths = [
    "/app/grc_vector_db",  # Docker path
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "grc_vector_db"), # Docker fallback
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "..", "grc_vector_db"), # Local path
    "grc_vector_db" # Fallback
]

DB_PATH = possible_paths[-1]
for path in possible_paths:
    if os.path.exists(path):
        DB_PATH = path
        break

chroma_client = chromadb.PersistentClient(path=DB_PATH)

# Use an open-source, highly accurate sentence transformer that runs directly on your CPU
local_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Pull the framework database index collection
collection = chroma_client.get_or_create_collection(
    name="compliance_frameworks",
    embedding_function=local_ef,
    metadata={"hnsw:space": "cosine"}
)

import json
from groq import Groq

# Initialize Groq client
client = None
if os.getenv("GROQ_API_KEY"):
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def refine_mapping_with_llm(evidence_text: str, framework_name: str, fallback_control_id: str, fallback_control_text: str, fallback_confidence: float) -> tuple:
    """Uses LLM to dynamically determine the exact section/clause ID, requirement text, and match confidence."""
    if not client:
        return fallback_control_id, fallback_control_text, fallback_confidence
        
    prompt = (
        "You are an expert Lead GRC and Regulatory Compliance Auditor.\n"
        f"The user policy statement is: \"{evidence_text}\"\n"
        f"This statement has been mapped to the framework: \"{framework_name}\".\n\n"
        "Your task is to:\n"
        "1. Identify the EXACT, most accurate section, article, clause, or requirement ID (e.g. 'Section-5', 'Article-32', 'CC6.1') "
        "and the corresponding formal regulation standard text under this framework that matches the policy statement.\n"
        "2. Evaluate how strongly and directly the policy statement satisfies this framework requirement, and assign a match confidence score between 0.0 and 1.0 (e.g. 0.95 for direct, strong satisfaction, 0.70 for partial/medium coverage, 0.30 for weak/implied coverage).\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        f"1. Search your memory for official '{framework_name}' standard requirements.\n"
        "2. If the user statement explicitly mentions a section or requirement number (e.g. 'DPDPA Sec 5', 'GDPR Article 6', etc.), you MUST extract and use that exact section as the control_id!\n"
        "3. Output a single valid JSON object containing exactly three keys: 'control_id', 'control_text', and 'confidence_score'.\n"
        "4. Do NOT include any markdown, headers, prefaces, or extra text. Only return the raw JSON object.\n\n"
        "Example output:\n"
        "{\n"
        "  \"control_id\": \"Section-5\",\n"
        "  \"control_text\": \"Every Data Fiduciary shall give notice to the Data Principal along with request for consent...\",\n"
        "  \"confidence_score\": 0.95\n"
        "}"
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=250,
            temperature=0.1
        )
        data = json.loads(response.choices[0].message.content)
        control_id = data.get("control_id", fallback_control_id)
        control_text = data.get("control_text", fallback_control_text)
        confidence_score = float(data.get("confidence_score", fallback_confidence))
        return control_id, control_text, confidence_score
    except Exception as e:
        return fallback_control_id, fallback_control_text, fallback_confidence

# Define schemas for type-safe cross-agent data transfers
class MappingResultItem(BaseModel):
    evidence_id: str = Field(description="The source ID from the extractor (e.g. CTRL-01)")
    evidence_text: str = Field(description="The literal text statement from the user policy file")
    mapped_framework: str = Field(description="Matched regulatory framework")
    framework_control_id: str = Field(description="The clause, requirement, or section indicator")
    framework_control_text: str = Field(description="The formal rule text from the framework documentation")
    confidence_score: float = Field(description="Cosine similarity index scaled between 0.0 and 1.0")

class MappingPayload(BaseModel):
    final_mappings: List[MappingResultItem]

from loguru import logger

# --- AGENT B: THE MAPPER ENGINE ---
def run_mapper_agent(extracted_controls: List[Any], target_framework: str = "all") -> MappingPayload:
    """Takes structured controls, runs an internal semantic vector look up, and maps matches."""
    mapped_items = []
    
    # Normalize framework string
    target_framework_clean = target_framework.strip()
    
    logger.info(f"Executing semantic lookup for {len(extracted_controls)} controls. Target Framework: '{target_framework_clean}'")
    
    if collection.count() == 0:
        logger.error("ChromaDB collection is empty! Mapping will fail.")
        return MappingPayload(final_mappings=[])

    # Construct metadata filter if a specific framework is requested
    where_filter = None
    if target_framework_clean and target_framework_clean.lower() != "all":
        where_filter = {"framework": target_framework_clean}
        logger.info(f"Applying strict metadata filter: {where_filter}")

    for item in extracted_controls:
        # Query ChromaDB using our local embedding functions and optional filter
        # Fetch up to 8 results (total frameworks) when mapping all, to capture matches across each framework
        query_params = {
            "query_texts": [item.control_text],
            "n_results": 10 if where_filter else 8
        }
        if where_filter:
            query_params["where"] = where_filter

        query_results = collection.query(**query_params)

        if query_results and query_results['ids'] and len(query_results['ids'][0]) > 0:
            found_match = False
            mapped_frameworks_for_control = set()

            for idx in range(len(query_results['ids'][0])):
                matched_meta = query_results['metadatas'][0][idx]
                framework_name = matched_meta['framework']

                # Manual Check
                if where_filter and framework_name != target_framework_clean:
                    continue

                # For 'all' frameworks mapping, prevent duplicate mappings to the same framework
                if not where_filter:
                    if framework_name in mapped_frameworks_for_control:
                        continue

                matched_id = query_results['ids'][0][idx]
                matched_doc = query_results['documents'][0][idx]

                # Convert cosine distance to a human-readable percentage score
                distance = query_results['distances'][0][idx]
                confidence = round(max(0.0, 1.0 - distance), 2)

                # For multi-framework mapping, only include matches with a minimal positive semantic overlap (>= 0.15) to capture candidates
                if not where_filter and confidence < 0.15:
                    continue

                logger.debug(f"Match confirmed: {framework_name} - {matched_meta['control_id']} (Score: {confidence})")

                # Refine with LLM to get highly accurate section ID, official requirement text, and match confidence
                control_id, control_text, refined_confidence = refine_mapping_with_llm(
                    item.control_text,
                    framework_name,
                    matched_meta['control_id'],
                    matched_doc,
                    confidence
                )

                # If multi-framework mapping is active, only retain matches where the LLM Auditor confirms compliance (refined score >= 0.40)
                if not where_filter and refined_confidence < 0.40:
                    continue

                mapped_items.append(MappingResultItem(
                    evidence_id=item.evidence_id,
                    evidence_text=item.control_text,
                    mapped_framework=framework_name,
                    framework_control_id=control_id,
                    framework_control_text=control_text,
                    confidence_score=refined_confidence
                ))
                found_match = True
                
                if not where_filter:
                    mapped_frameworks_for_control.add(framework_name)
                else:
                    # Take only the single best match for the specific target framework
                    break

            if not found_match:
                logger.warning(f"No match found for {item.evidence_id} within restricted framework: {target_framework_clean}")
        else:
            logger.warning(f"No match found in ChromaDB for control: {item.evidence_id} (Filter: {where_filter})")
    return MappingPayload(final_mappings=mapped_items)

if __name__ == "__main__":
    print("Mapper Module successfully verified. Ready to receive pipeline streams.")