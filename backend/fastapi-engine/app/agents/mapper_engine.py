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
def run_mapper_agent(extracted_controls: List[Any]) -> MappingPayload:
    """Takes structured controls, runs an internal semantic vector look up, and maps matches."""
    mapped_items = []
    
    logger.info(f"Executing semantic lookup across 8 compliance frameworks for {len(extracted_controls)} controls...")
    
    if collection.count() == 0:
        logger.error("ChromaDB collection is empty! Mapping will fail.")
        return MappingPayload(final_mappings=[])

    for item in extracted_controls:
        logger.debug(f"Querying for control: {item.evidence_id} - {item.control_heading}")
        # Query ChromaDB using our local embedding functions
        query_results = collection.query(
            query_texts=[item.control_text],
            n_results=1  # Pull the single closest regulatory framework match
        )
        
        if query_results and query_results['ids'] and query_results['ids'][0]:
            matched_id = query_results['ids'][0][0]
            matched_doc = query_results['documents'][0][0]
            matched_meta = query_results['metadatas'][0][0]
            
            # Convert cosine distance to a human-readable percentage score
            distance = query_results['distances'][0][0]
            confidence = round(max(0.0, 1.0 - distance), 2)
            
            logger.debug(f"Match found for {item.evidence_id}: {matched_meta['framework']} - {matched_meta['control_id']} (Score: {confidence})")
            
            mapped_items.append(MappingResultItem(
                evidence_id=item.evidence_id,
                evidence_text=item.control_text,
                mapped_framework=matched_meta['framework'],
                framework_control_id=matched_meta['control_id'],
                framework_control_text=matched_doc,
                confidence_score=confidence
            ))
        else:
            logger.warning(f"No match found in ChromaDB for control: {item.evidence_id}")
            
    logger.info(f"Successfully mapped {len(mapped_items)} out of {len(extracted_controls)} controls.")
    return MappingPayload(final_mappings=mapped_items)

if __name__ == "__main__":
    print("Mapper Module successfully verified. Ready to receive pipeline streams.")