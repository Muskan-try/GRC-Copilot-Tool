import os
from typing import List
from pydantic import BaseModel, Field
import chromadb
from chromadb.utils import embedding_functions  # <-- Ensure this is imported

class FrameworkControl(BaseModel):
    framework: str = Field(description="The formal name of the regulatory framework")
    control_id: str = Field(description="The exact clause, article, or section number")
    category: str = Field(description="The functional security domain or category name")
    control_text: str = Field(description="The definitive technical description of the control requirement")

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

# SWAPPED: Changed from OpenAI to free local sentence-transformers
local_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

collection = chroma_client.get_or_create_collection(
    name="compliance_frameworks",
    embedding_function=local_ef,
    metadata={"hnsw:space": "cosine"}
)

# 3. Comprehensive Seed Data: The 8 Mandated Frameworks
frameworks_seed_data: List[FrameworkControl] = [
    # --- DPDPA (INDIA) ---
    FrameworkControl(
        framework="DPDPA-2023",
        control_id="Section-8(5)",
        category="Obligations of Data Fiduciary",
        control_text="A Data Fiduciary shall protect personal data in its possession or under its control by taking reasonable security safeguards to prevent personal data breach."
    ),
    # --- GDPR ---
    FrameworkControl(
        framework="GDPR",
        control_id="Article-32",
        category="Security of Processing",
        control_text="The controller and processor shall implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk, including pseudonymisation and encryption of personal data."
    ),
    # --- HIPAA ---
    FrameworkControl(
        framework="HIPAA",
        control_id="164.312(a)(1)",
        category="Technical Safeguards - Access Control",
        control_text="Implement technical policies and procedures for electronic information systems that maintain electronic protected health information to allow access only to those persons or software programs granted access."
    ),
    # --- ISO 27001:2022 ---
    FrameworkControl(
        framework="ISO-27001-2022",
        control_id="A.8.13",
        category="Information Security Controls - Technological",
        control_text="Backup copies of information, software and system images shall be taken and tested regularly in accordance with the agreed backup policy."
    ),
    # --- NIST CSF 2.0 ---
    FrameworkControl(
        framework="NIST-CSF-2.0",
        control_id="PR.AC-05",
        category="Protect - Identity Management and Access Control",
        control_text="Physical access to assets is managed and protected throughout their life cycle to prevent unauthorized access."
    ),
    # --- SOC 2 (Trust Services Criteria) ---
    FrameworkControl(
        framework="SOC2",
        control_id="CC6.1",
        category="Logical and Physical Access Controls",
        control_text="The entity implements logical access controls over software, infrastructure, and architectures to protect information assets from unauthorized use."
    ),
    # --- PCI DSS v4.0 ---
    FrameworkControl(
        framework="PCI-DSS-v4.0",
        control_id="Requirement-8.3.1",
        category="Identity and Access Management",
        control_text="Multi-factor authentication (MFA) is implemented for all personnel with administrative access into the cardholder data environment (CDE)."
    ),
    # --- CIS Controls v8 ---
    FrameworkControl(
        framework="CIS-v8",
        control_id="CIS-4.1",
        category="Data Protection",
        control_text="Establish and maintain a secure data inventory. Ensure only authorized production data is retained and securely stored."
    )
]

# 4. Processing Pipeline
def initialize_knowledge_base():
    print(f"Loading {len(frameworks_seed_data)} compliance frameworks into vector store...")
    
    ids = []
    documents = []
    metadatas = []
    
    for ctrl in frameworks_seed_data:
        unique_id = f"{ctrl.framework}_{ctrl.control_id}".replace(" ", "_").replace(".", "-")
        ids.append(unique_id)
        documents.append(ctrl.control_text)
        metadatas.append({
            "framework": ctrl.framework,
            "control_id": ctrl.control_id,
            "category": ctrl.category
        })
        
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )
    print("✓ Local database vector index successfully generated.")

if __name__ == "__main__":
    # Make sure you have export OPENAI_API_KEY="your-key" set in your terminal before running
    initialize_knowledge_base()