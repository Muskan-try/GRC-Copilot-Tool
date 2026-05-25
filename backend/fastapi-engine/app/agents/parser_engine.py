import os
from dotenv import load_dotenv
load_dotenv() # This forces Python to look for your .env file and read your key!
from typing import List
from docx import Document
from pypdf import PdfReader
from pydantic import BaseModel, Field
from groq import Groq  # <-- Swapped from OpenAI

# Initialize the Groq Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# The schemas remain EXACTLY the same as before
class ExtractedControlItem(BaseModel):
    evidence_id: str = Field(description="A sequential tracking identifier like CTRL-01, CTRL-02")
    control_heading: str = Field(description="A short, clear name for the identified security practice")
    control_text: str = Field(description="The exact literal text or descriptive sentence proving the security measure")

class ExtractionPayload(BaseModel):
    controls_found: List[ExtractedControlItem]

# --- FILE PARSING ENGINE (Stays identical) ---
def extract_text_from_file(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Target compliance document not found at: {file_path}")
        
    ext = os.path.splitext(file_path)[1].lower()
    extracted_text = ""

    if ext == ".docx":
        doc = Document(file_path)
        extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()])
    elif ext == ".pdf":
        reader = PdfReader(file_path)
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"
    return extracted_text.strip()

def is_security_policy(raw_text: str) -> bool:
    """Uses LLM to quickly determine if the text is actually a security/compliance policy."""
    if not raw_text or len(raw_text) < 50:
        return False
        
    prompt = (
        "Analyze the text below. Is this a formal security policy, compliance document, or organizational standard? "
        "Respond with 'YES' or 'NO' followed by a short reason. "
        "A train ticket, restaurant menu, or personal letter should be 'NO'. "
        "An ISO manual, SOC 2 policy, or Employee Handbook should be 'YES'.\n\n"
        f"TEXT START: {raw_text[:2000]}"
    )
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=20
    )
    
    answer = response.choices[0].message.content.strip().upper()
    return answer.startswith("YES")

# --- AGENT A: THE GROQ EXTRACTOR AGENT ---
def run_extractor_agent(raw_text: str) -> ExtractionPayload:
    """Analyzes raw text and forces Groq to give a structured Pydantic response."""
    
    system_instruction = (
        "You are an expert Cyber Security and GRC Auditor. Your singular directive is to parse raw text "
        "and isolate specific, actionable security practices or technical controls.\n\n"
        "You MUST respond ONLY with a JSON object that matches this schema:\n"
        f"{ExtractionPayload.model_json_schema()}"
    )

    # Groq handles structured data by setting the response format to json_object
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # ✅ Current Production Flagship
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Analyze the following raw parsed text dump and extract all core security controls:\n\n{raw_text}"}
        ],
        response_format={"type": "json_object"}  
    )
    
    # Parse the raw JSON string back into our type-safe Pydantic object
    raw_json_string = response.choices[0].message.content
    return ExtractionPayload.model_validate_json(raw_json_string)

# --- LOCAL WORKSPACE VERIFICATION BLOCK ---
if __name__ == "__main__":
    import os
    
    # Force Python to find the absolute directory where your terminal is sitting
    current_working_directory = os.getcwd()
    test_file = os.path.join(current_working_directory, "sample_policy.docx")
    
    print(f"Targeting file absolute path: {test_file}")
    
    if os.path.exists(test_file):
        print(f"Reading and parsing text from local asset...")
        try:
            # Pass the absolute path string directly to the parser function
            parsed_string = extract_text_from_file(test_file)
            
            print("Dispatching data payload to Groq Extractor Agent...")
            structured_results = run_extractor_agent(parsed_string)
            
            print("\n--- Groq Extractor Agent Output Verification ---")
            for item in structured_results.controls_found:
                print(f"\nID: {item.evidence_id} | Heading: {item.control_heading}")
                print(f"Extracted Statement: \"{item.control_text}\"")
        except Exception as e:
            print(f"Extraction Pipeline failed: {e}")
    else:
        print(f"ERROR: Could not locate 'sample_policy.docx' inside {current_working_directory}")