"""
Senior Compliance Auditor & Risk Analyst Report Engine.
Generates highly accurate, data-driven compliance reports based strictly 
on questionnaire responses without introducing generic or assumed content.
"""

from typing import Any, List, Dict
from loguru import logger

# Answer index → score mapping
ANSWER_SCORES = {0: 100.0, 1: 65.0, 2: 30.0, 3: 0.0}
ANSWER_LABELS = {0: "Implemented", 1: "Partial", 2: "Draft", 3: "Missing"}

class AuditReportEngine:
    """Precise, audit-level report generation engine."""

    def run_analysis(self, data: dict) -> dict[str, Any]:
        """Main analysis pipeline for audit-ready reports."""
        responses = data.get("responses", [])
        framework = data.get("framework", "Unknown")
        org = data.get("organization", {})
        org_name = org.get("name", "Organization")
        analysis_depth = data.get("analysis_depth", "quick")
        
        if not responses:
            return self._empty_analysis(framework, org_name)

        # 1. Precise Scoring
        overall_score = self._compute_overall_score(responses)
        domain_scores = self._compute_domain_scores(responses)
        
        # 2. Traceable Risk Assessment
        risk_analysis = self._build_risk_assessment(responses)
        
        # 3. Gap Analysis (Strictly from responses)
        gap_analysis = self._build_gap_analysis(responses)
        
        # 4. Detailed Control Gap Analysis
        controls_mapping = self._build_controls_mapping(responses)
        
        # 5. Data-Driven Executive Summary
        executive_summary = self._generate_executive_summary(
            overall_score, framework, org_name, responses, gap_analysis
        )
        
        # 6. Recommendations (Specific, not generic)
        recommendations = self._generate_recommendations(responses, framework)

        # 7. Financial Summary (Heuristic based on identified gaps)
        cost_summary = self._calculate_costs(recommendations)

        return {
            "compliance_score": overall_score,
            "risk_level": self._get_risk_level(overall_score),
            "executive_summary": executive_summary,
            "domain_scores": domain_scores,
            "risk_analysis": risk_analysis,
            "gap_analysis": gap_analysis,
            "controls_mapping": controls_mapping,
            "recommendations": recommendations,
            "cost_summary": cost_summary,
            "framework": framework,
            "organization": org_name,
            "analysis_depth": analysis_depth,
            "traceability_matrix": self._build_traceability(responses)
        }

    def _compute_overall_score(self, responses: List[Dict]) -> float:
        total = sum(ANSWER_SCORES.get(r["answer_index"], 0) * r.get("weight", 1.0) for r in responses)
        total_weight = sum(r.get("weight", 1.0) for r in responses)
        return round(total / total_weight, 1) if total_weight > 0 else 0.0

    def _compute_domain_scores(self, responses: List[Dict]) -> List[Dict]:
        domains = {}
        for r in responses:
            cat = r.get("category", "General")
            weight = r.get("weight", 1.0)
            score = ANSWER_SCORES.get(r["answer_index"], 0) * weight
            if cat not in domains:
                domains[cat] = {"score_sum": 0.0, "weight_sum": 0.0, "count": 0}
            domains[cat]["score_sum"] += score
            domains[cat]["weight_sum"] += weight
            domains[cat]["count"] += 1
        
        return [
            {
                "domain": name,
                "score": round(d["score_sum"] / d["weight_sum"], 1) if d["weight_sum"] > 0 else 0.0,
                "count": d["count"]
            }
            for name, d in domains.items()
        ]

    def _get_risk_level(self, score: float) -> str:
        if score >= 85: return "Low"
        if score >= 65: return "Medium"
        if score >= 40: return "High"
        return "Critical"

    def _build_risk_assessment(self, responses: List[Dict]) -> Dict:
        risks = []
        distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        
        for r in responses:
            idx = r["answer_index"]
            if idx >= 1: # Partial, Draft, or Missing
                # Severity derived from answer + weight
                severity = "critical" if idx == 3 else "high" if idx == 2 else "medium"
                
                risks.append({
                    "response_ref": r["question_id"],
                    "title": f"Risk identified in {r.get('category')}",
                    "description": f"The response '{r.get('answer_text', ANSWER_LABELS[idx])}' for control '{r.get('text')}' indicates a deficiency.",
                    "severity": severity,
                    "justification": f"Directly based on response index {idx} with weight {r.get('weight', 1.0)}."
                })
                distribution[severity] += 1
            else:
                distribution["low"] += 1
        
        return {
            "risks": risks,
            "distribution": distribution
        }

    def _build_gap_analysis(self, responses: List[Dict]) -> List[Dict]:
        gaps = []
        for r in responses:
            if r["answer_index"] >= 1:
                gaps.append({
                    "question_id": r["question_id"],
                    "domain": r.get("category"),
                    "control_text": r.get("text"),
                    "current_status": ANSWER_LABELS.get(r["answer_index"]),
                    "gap_description": f"Control is not fully implemented. Selected response: {r.get('answer_text', 'N/A')}",
                    "impact": "High" if r["answer_index"] == 3 else "Medium"
                })
        return gaps

    def _build_controls_mapping(self, responses: List[Dict]) -> List[Dict]:
        return [
            {
                "control_ref": r["question_id"],
                "text": r.get("text"),
                "status": ANSWER_LABELS.get(r["answer_index"]),
                "score": ANSWER_SCORES.get(r["answer_index"]),
                "domain": r.get("category")
            }
            for r in responses
        ]

    def _generate_executive_summary(self, score: float, framework: str, org: str, responses: List[Dict], gaps: List[Dict]) -> str:
        implemented = sum(1 for r in responses if r["answer_index"] == 0)
        partial = sum(1 for r in responses if r["answer_index"] == 1)
        missing = sum(1 for r in responses if r["answer_index"] >= 2)
        
        summary = (
            f"This compliance report provides a data-driven assessment of {org} against the {framework} framework. "
            f"Based on the {len(responses)} controls evaluated, the organization has achieved a compliance score of {score}%. "
            f"The assessment identifies {implemented} fully implemented controls, {partial} partially implemented controls, and {missing} controls with significant gaps. "
        )
        
        if missing > 0:
            top_gap_domains = list(set([g["domain"] for g in gaps if g["impact"] == "High"]))
            if top_gap_domains:
                summary += f"Critical deficiencies were identified specifically in the following domains: {', '.join(top_gap_domains)}. "
        
        summary += "The findings in this report are strictly derived from the provided questionnaire responses."
        return summary

    def _generate_recommendations(self, responses: List[Dict], framework: str) -> List[Dict]:
        recommendations = []
        for r in responses:
            idx = r["answer_index"]
            if idx >= 1:
                # Use the hint from the question bank as the basis for the recommendation
                base_action = r.get("hint", f"Implement control for {r.get('category')}")
                recommendations.append({
                    "control_ref": r["question_id"],
                    "priority": "Critical" if idx == 3 else "High" if idx == 2 else "Medium",
                    "remediation_action": base_action,
                    "cost_estimate_inr": 50000 if idx == 3 else 20000
                })
        return sorted(recommendations, key=lambda x: (x["priority"] == "Critical", x["priority"] == "High"), reverse=True)

    def _calculate_costs(self, recommendations: List[Dict]) -> Dict:
        total = sum(r["cost_estimate_inr"] for r in recommendations)
        return {
            "total_estimated_inr": total,
            "currency": "INR",
            "breakdown": [
                {"item": r["control_ref"], "cost": r["cost_estimate_inr"]}
                for r in recommendations[:10]
            ]
        }

    def _build_traceability(self, responses: List[Dict]) -> List[Dict]:
        return [
            {
                "question": r["question_id"],
                "response": r["answer_index"],
                "mapped_score": ANSWER_SCORES.get(r["answer_index"]),
                "finding": "Compliant" if r["answer_index"] == 0 else "Gap"
            }
            for r in responses
        ]

    def _empty_analysis(self, framework: str, org: str) -> dict:
        return {
            "compliance_score": 0.0,
            "risk_level": "N/A",
            "executive_summary": "No data available for analysis.",
            "status": "empty"
        }

report_engine = AuditReportEngine()
