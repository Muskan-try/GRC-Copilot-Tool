"""
Core scoring & analysis engine.
Computes compliance scores, risk levels, gap analysis, controls mapping,
recommendations, and cost estimation.
"""

from typing import Any

# Answer index → score mapping
# 0 = fully implemented (100%)
# 1 = partially implemented (65%)
# 2 = in draft/planning (30%)
# 3 = not implemented (0%)
ANSWER_SCORES = {0: 100.0, 1: 65.0, 2: 30.0, 3: 0.0}

ANSWER_LABELS = {0: "Implemented", 1: "Partial", 2: "Draft", 3: "Missing"}

CONTROL_STATUS = {0: "implemented", 1: "partial", 2: "partial", 3: "missing"}


def compute_domain_scores(responses: list[dict]) -> list[dict]:
    """Compute per-domain scores."""
    domains: dict[str, dict] = {}
    for r in responses:
        cat = r.get("category", "General")
        idx = r["answer_index"]
        score = ANSWER_SCORES.get(idx, 0)
        if cat not in domains:
            domains[cat] = {"domain": cat, "total": 0.0, "count": 0, "answered": 0}
        domains[cat]["total"] += score
        domains[cat]["count"] += 1
        if idx < 3:
            domains[cat]["answered"] += 1

    result = []
    for cat, d in domains.items():
        avg = d["total"] / d["count"] if d["count"] > 0 else 0
        result.append({
            "domain": d["domain"],
            "score": round(avg, 1),
            "questions_total": d["count"],
            "questions_answered": d["answered"],
        })
    return result


def compute_overall_score(responses: list[dict]) -> float:
    """Compute overall compliance score."""
    if not responses:
        return 0.0
    total = sum(ANSWER_SCORES.get(r["answer_index"], 0) for r in responses)
    return round(total / len(responses), 1)


def determine_risk_level(score: float) -> str:
    """Determine risk level from compliance score."""
    if score >= 75:
        return "Low"
    elif score >= 50:
        return "Medium"
    elif score >= 25:
        return "High"
    else:
        return "Critical"


def build_risk_analysis(responses: list[dict], risk_priorities: dict, overall_score: float, risk_level: str) -> dict:
    """Build risk analysis section."""
    risks = []
    distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for r in responses:
        idx = r["answer_index"]
        if idx >= 2:  # Draft or Missing → create risk entry
            severity = "critical" if idx == 3 else "high" if ANSWER_SCORES.get(idx, 0) < 50 else "medium"
            user_pri = risk_priorities.get(r["question_id"], "medium")

            risk_entry = {
                "id": r["question_id"],
                "title": f"Risk in {r.get('category', 'General')}",
                "category": r.get("category", "General"),
                "likelihood": 3 if idx == 3 else 2,
                "impact": 4 if idx == 3 else 3,
                "severity": severity,
                "mitigation": f"Address gap in {r.get('category', 'control area')}.",
                "user_priority": user_pri,
            }
            risks.append(risk_entry)
            distribution[severity] = distribution.get(severity, 0) + 1

    # Count low risk (answered well)
    distribution["low"] = sum(1 for r in responses if r["answer_index"] <= 0)

    return {
        "overall_score": overall_score,
        "risk_level": risk_level,
        "risks": risks,
        "distribution": distribution,
    }


def build_gap_analysis(responses: list[dict]) -> list[dict]:
    """Build gap analysis for partially or non-implemented controls."""
    gaps = []
    for r in responses:
        idx = r["answer_index"]
        if idx >= 1:  # Partial or worse
            severity = "critical" if idx == 3 else "medium"
            gaps.append({
                "control_id": f"CTL-{r['question_id']}",
                "control_name": f"{r.get('category', 'General')} Control",
                "domain": r.get("category", "General"),
                "current_state": ANSWER_LABELS.get(idx, "Unknown"),
                "required_state": "Implemented",
                "gap_severity": severity,
                "question_ref": r["question_id"],
            })
    return gaps


def build_controls_mapping(responses: list[dict], evidence_total: int) -> list[dict]:
    """Map controls to their implementation status."""
    controls = []
    for r in responses:
        status = CONTROL_STATUS.get(r["answer_index"], "missing")
        controls.append({
            "control_id": f"CTL-{r['question_id']}",
            "control_name": f"{r.get('category', 'General')} Control",
            "domain": r.get("category", "General"),
            "status": status,
            "evidence_count": r.get("evidence_count", 0),
        })
    return controls


def build_recommendations(responses: list[dict], domain_scores: list[dict]) -> list[dict]:
    """Generate prioritized recommendations."""
    recs = []
    short_count = 0
    mid_count = 0
    long_count = 0

    # Sort domains by score (worst first)
    sorted_domains = sorted(domain_scores, key=lambda d: d["score"])

    for d in sorted_domains:
        score = d["score"]
        domain = d["domain"]

        if score < 40:
            recs.append({
                "title": f"Critical: Improve {domain}",
                "detail": f"{domain} controls are significantly below target. Immediate action required.",
                "horizon": "short",
                "priority": "critical",
                "base_cost_usd": 600 + (40 - score) * 25,
                "cost_inr": 50000 + (40 - score) * 2000,
                "effort": "high",
            })
            short_count += 1
        elif score < 65:
            recs.append({
                "title": f"Improve {domain} controls",
                "detail": f"{domain} needs enhancement to reach compliance threshold.",
                "horizon": "mid",
                "priority": "high",
                "base_cost_usd": 350 + (65 - score) * 20,
                "cost_inr": 30000 + (65 - score) * 1500,
                "effort": "medium",
            })
            mid_count += 1
        elif score < 85:
            recs.append({
                "title": f"Optimize {domain}",
                "detail": f"{domain} is good but can be further strengthened.",
                "horizon": "long",
                "priority": "medium",
                "base_cost_usd": 180 + (85 - score) * 12,
                "cost_inr": 15000 + (85 - score) * 1000,
                "effort": "low",
            })
            long_count += 1

    # Ensure at least some recommendations in each horizon
    if short_count == 0 and recs:
        recs[0]["horizon"] = "short"
    if mid_count == 0 and len(recs) > 1:
        recs[1]["horizon"] = "mid"
    if long_count == 0 and len(recs) > 2:
        recs[2]["horizon"] = "long"

    return recs


def build_cost_summary(recommendations: list[dict], gap_analysis: list[dict]) -> dict:
    """Build cost estimation."""
    total_inr = sum(r["cost_inr"] for r in recommendations)
    critical_inr = sum(r["cost_inr"] for r in recommendations if r["priority"] == "critical")
    total_usd = sum(r["base_cost_usd"] for r in recommendations)
    critical_usd = sum(r["base_cost_usd"] for r in recommendations if r["priority"] == "critical")

    breakdown = {}
    for r in recommendations:
        cat = r.get("detail", "General")[:30]
        breakdown[cat] = breakdown.get(cat, 0) + r["base_cost_usd"]

    items = []
    for r in recommendations:
        timeline = "0-3 months" if r["horizon"] == "short" else "3-6 months" if r["horizon"] == "mid" else "6-12 months"
        items.append({
            "label": r["title"],
            "category": r["horizon"],
            "base_cost_usd": r["base_cost_usd"],
            "cost_inr": r["cost_inr"],
            "timeline": timeline,
        })

    return {
        "total_inr": total_inr,
        "critical_inr": critical_inr,
        "total_usd": total_usd,
        "critical_usd": critical_usd,
        "breakdown": breakdown,
        "items": items,
    }


def build_executive_summary(overall_score: float, risk_level: str, framework: str, org_name: str,
                            gap_count: int, total_questions: int) -> str:
    """Generate executive summary text."""
    return (
        f"Assessment of {org_name or 'the organization'} against {framework} framework.\n\n"
        f"Overall compliance score: {overall_score}% ({risk_level} risk). "
        f"{total_questions} controls assessed, {gap_count} gaps identified.\n\n"
        f"{'The organization demonstrates strong compliance posture.' if overall_score >= 75 else ''}"
        f"{'Significant gaps require immediate attention.' if overall_score < 50 else ''}"
        f"{'Moderate gaps identified; remediation recommended within 3-6 months.' if 50 <= overall_score < 75 else ''}"
    )


def run_full_analysis(data: dict) -> dict[str, Any]:
    """Main analysis pipeline — called by the FastAPI router."""
    responses = data["responses"]
    risk_priorities = data.get("risk_priorities", {})
    framework = data.get("framework", "Unknown")
    org = data.get("organization", {})
    evidence_total = data.get("evidence_total", 0)

    # Compute scores
    overall_score = compute_overall_score(responses)
    risk_level = determine_risk_level(overall_score)
    domain_scores = compute_domain_scores(responses)

    # Build sections
    risk_analysis = build_risk_analysis(responses, risk_priorities, overall_score, risk_level)
    gap_analysis = build_gap_analysis(responses)
    controls_mapping = build_controls_mapping(responses, evidence_total)
    recommendations = build_recommendations(responses, domain_scores)
    cost_summary = build_cost_summary(recommendations, gap_analysis)

    org_name = org.get("name", "Organization")
    gap_count = len(gap_analysis)
    total_questions = len(responses)

    executive_summary = build_executive_summary(
        overall_score, risk_level, framework, org_name, gap_count, total_questions
    )

    return {
        "compliance_score": overall_score,
        "risk_level": risk_level,
        "executive_summary": executive_summary,
        "domain_scores": domain_scores,
        "risk_analysis": risk_analysis,
        "gap_analysis": gap_analysis,
        "controls_mapping": controls_mapping,
        "recommendations": recommendations,
        "cost_summary": cost_summary,
        "framework": framework,
        "organization": org_name,
    }
