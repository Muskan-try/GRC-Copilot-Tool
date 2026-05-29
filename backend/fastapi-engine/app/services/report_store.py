"""
MongoDB report persistence layer.
"""

import os
from datetime import datetime
from loguru import logger
from app.core import database


async def save_report(report_data: dict) -> str:
    """Save a report to MongoDB and return report_id."""
    report_id = f"rpt_{report_data.get('assessment_id', 'unknown')}_{int(datetime.utcnow().timestamp())}"

    doc = {
        "report_id": report_id,
        "assessment_id": report_data["assessment_id"],
        "org_id": report_data.get("org_id", ""),
        "framework": report_data.get("framework", ""),
        "compliance_score": report_data.get("compliance_score", 0),
        "risk_level": report_data.get("risk_level", ""),
        "executive_summary": report_data.get("executive_summary", ""),
        "risk_analysis": report_data.get("risk_analysis", {}),
        "gap_analysis": report_data.get("gap_analysis", []),
        "controls_mapping": report_data.get("controls_mapping", []),
        "recommendations": report_data.get("recommendations", []),
        "cost_summary": report_data.get("cost_summary", {}),
        "domain_scores": report_data.get("domain_scores", []),
        "evidence_count": report_data.get("evidence_total", 0),
        "status": "complete",
        "generated_at": datetime.utcnow(),
    }

    collection = database.mongo_db["reports"]
    await collection.insert_one(doc)
    logger.info(f"Report saved to MongoDB: {report_id}")
    return report_id


async def get_report(report_id: str) -> dict | None:
    """Retrieve a report by report_id."""
    collection = database.mongo_db["reports"]
    doc = await collection.find_one({"report_id": report_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def get_report_by_assessment(assessment_id: str) -> dict | None:
    """Retrieve a report by assessment_id."""
    collection = database.mongo_db["reports"]
    doc = await collection.find_one({"assessment_id": assessment_id})
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc
