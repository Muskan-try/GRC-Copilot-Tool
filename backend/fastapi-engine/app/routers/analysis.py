from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from loguru import logger

from app.models.schemas import AnalysisRequest
from app.services.audit_report_engine import report_engine as run_full_analysis
from app.services.report_store import save_report, get_report, get_report_by_assessment
from app.services.pdf_generator import generate_pdf
from app.services.docx_generator import generate_docx

router = APIRouter()


class AnalysisResponse(BaseModel):
    report_id: str
    assessment_id: str
    framework: str
    compliance_score: float
    risk_level: str
    executive_summary: str
    domain_scores: list
    risk_analysis: dict
    gap_analysis: list
    controls_mapping: list
    recommendations: list
    cost_summary: dict
    pdf_url: Optional[str] = None
    docx_url: Optional[str] = None
    status: str = "complete"
    progress_rate: Optional[float] = None


@router.post("/generate-report", response_model=AnalysisResponse)
async def generate_report(req: AnalysisRequest):
    """Full analysis pipeline: score → gaps → recommendations → cost → persist."""
    try:
        # Run the analysis
        analysis = run_full_analysis.run_analysis({
            "assessment_id": req.assessment_id,
            "framework": req.framework,
            "analysis_depth": req.analysis_depth,
            "organization": req.organization.model_dump(),
            "responses": [r.model_dump() for r in req.responses],
            "risk_priorities": req.risk_priorities,
            "evidence_total": req.evidence_total,
            "compliance_score": req.compliance_score,
        })

        # Save to MongoDB
        report_data = {
            "assessment_id": req.assessment_id,
            "framework": req.framework,
            "organization": req.organization.name,
            **analysis,
        }
        report_id = await save_report(report_data)

        # Generate PDF and DOCX
        output_dir = os.getenv("REPORT_OUTPUT_DIR", "./reports")
        try:
            pdf_path = generate_pdf(report_data, output_dir)
            docx_path = generate_docx(report_data, output_dir)
        except Exception as e:
            logger.warning(f"Document generation failed: {e}")
            pdf_path = None
            docx_path = None

        return AnalysisResponse(
            report_id=report_id,
            assessment_id=req.assessment_id,
            framework=req.framework,
            compliance_score=analysis["compliance_score"],
            risk_level=analysis["risk_level"],
            executive_summary=analysis["executive_summary"],
            domain_scores=analysis["domain_scores"],
            risk_analysis=analysis["risk_analysis"],
            gap_analysis=analysis["gap_analysis"],
            controls_mapping=analysis["controls_mapping"],
            recommendations=analysis["recommendations"],
            cost_summary=analysis["cost_summary"],
            pdf_url=pdf_path,
            docx_url=docx_path,
            status="complete",
            progress_rate=analysis.get("progress_rate", 0.0),
        )

    except Exception as e:
        logger.error(f"Analysis generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/{report_id}")
async def get_report_endpoint(report_id: str):
    """Retrieve a report by report_id."""
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/report/assessment/{assessment_id}")
async def get_report_by_assessment_endpoint(assessment_id: str):
    """Retrieve a report by assessment_id."""
    report = await get_report_by_assessment(assessment_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this assessment")
    return report


@router.get("/report/{report_id}/sections/{section}")
async def get_report_section(report_id: str, section: str):
    """Get a specific section of a report."""
    report = await get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    valid_sections = ['executive_summary', 'risk_analysis', 'gap_analysis',
                      'controls_mapping', 'recommendations', 'cost_summary', 'domain_scores']
    if section not in valid_sections:
        raise HTTPException(status_code=400, detail=f"Invalid section. Valid: {', '.join(valid_sections)}")

    return {
        "report_id": report_id,
        "section": section,
        "data": report.get(section),
        "compliance_score": report.get("compliance_score"),
        "risk_level": report.get("risk_level"),
    }
