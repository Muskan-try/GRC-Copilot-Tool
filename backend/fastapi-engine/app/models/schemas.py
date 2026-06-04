from pydantic import BaseModel
from typing import Optional


class ResponseItem(BaseModel):
    question_id: str
    answer_index: int
    answer_text: Optional[str] = None
    maturity_score: Optional[int] = None
    category: Optional[str] = None
    domain: Optional[str] = None
    control: Optional[str] = None
    text: Optional[str] = None
    hint: Optional[str] = None
    weight: float = 1.0
    critical: bool = False
    evidence_count: int = 0


class OrganizationInfo(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    region: Optional[str] = None
    employee_range: Optional[str] = None
    contact_name: Optional[str] = None


class AnalysisRequest(BaseModel):
    assessment_id: str
    framework: str
    analysis_depth: str = "normal"
    organization: OrganizationInfo = OrganizationInfo()
    responses: list[ResponseItem]
    risk_priorities: dict[str, str] = {}
    evidence_total: int = 0
    compliance_score: Optional[float] = None


class RecommendationItem(BaseModel):
    title: str
    detail: str
    horizon: str  # short, mid, long
    priority: str
    cost_inr: int
    effort: str


class GapItem(BaseModel):
    control_id: str
    control_name: str
    domain: str
    current_state: str
    required_state: str
    gap_severity: str
    question_ref: str


class ControlItem(BaseModel):
    control_id: str
    control_name: str
    domain: str
    status: str  # implemented, partial, missing
    evidence_count: int


class CostItem(BaseModel):
    label: str
    category: str
    cost_inr: int
    timeline: str


class RiskItem(BaseModel):
    id: str
    title: str
    category: str
    likelihood: int
    impact: int
    severity: str
    mitigation: str
    user_priority: str = "medium"


class ReportResponse(BaseModel):
    report_id: str
    assessment_id: str
    framework: str
    compliance_score: float
    risk_level: str
    executive_summary: str
    domain_scores: list = []
    risk_analysis: dict = {}
    gap_analysis: list = []
    controls_mapping: list = []
    recommendations: list = []
    cost_summary: dict = {}
    status: str = "complete"
