const express = require('express');
const { query, verifyAssessmentOwnership } = require('../config/postgres');
const { Report } = require('../config/mongo');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// GET /api/dashboard/:assessmentId
router.get('/:assessmentId', authenticate, async (req, res, next) => {
  try {
    const { assessmentId } = req.params;

    await verifyAssessmentOwnership(assessmentId, req.user.org_id);

    const assessResult = await query(
      `SELECT a.*, o.name AS org_name, o.industry, o.region, o.frameworks
       FROM assessments a
       JOIN organizations o ON o.id = a.org_id
       WHERE a.id = $1 AND a.org_id = $2`,
      [assessmentId, req.user.org_id]
    );

    if (!assessResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const assessment = assessResult.rows[0];

    if (assessment.status !== 'complete') {
      return res.json({
        assessment_id: assessmentId,
        status: assessment.status,
        message: assessment.status === 'analyzing' ? 'Analysis in progress, please wait...' : `Assessment status: ${assessment.status}`,
        compliance_score: assessment.compliance_score,
        answered_questions: assessment.answered_questions,
        total_questions: assessment.total_questions,
      });
    }

    // Fetch full report from MongoDB
    const report = await Report.findOne({ assessment_id: assessmentId });

    if (!report) {
      return res.status(404).json({ error: 'Report not found. Analysis may still be running.' });
    }

    // Get evidence count
    const evidenceResult = await query(
      'SELECT COUNT(*) FROM evidence_files WHERE assessment_id = $1',
      [assessmentId]
    );

    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.AUDIT_LOG_VIEW, 'dashboard', assessmentId, {}, req).catch(() => {});
    res.json({
      assessment_id: assessmentId,
      status: 'complete',
      framework: assessment.framework,
      organization: assessment.org_name,
      industry: assessment.industry,
      region: assessment.region,
      generated_at: report.generated_at,
      compliance_score: assessment.compliance_score,
      risk_level: assessment.risk_level,
      total_cost_inr: report.cost_summary?.total_inr,
      critical_cost_inr: report.cost_summary?.critical_inr,
      evidence_files: parseInt(evidenceResult.rows[0].count),
      domain_scores: report.domain_scores,
      control_status: {
        implemented: report.controls_mapping?.filter(c => c.status === 'implemented').length || 0,
        partial: report.controls_mapping?.filter(c => c.status === 'partial').length || 0,
        missing: report.controls_mapping?.filter(c => c.status === 'missing').length || 0,
      },
      cost_by_category: report.cost_summary?.breakdown,
      risk_distribution: report.risk_analysis?.distribution,
      top_recommendations: report.recommendations?.slice(0, 3).map(r => ({
        title: r.title,
        horizon: r.horizon,
        cost_inr: r.cost_inr,
      })),
      cyber_insurance: {
        recommended: (assessment.compliance_score || 0) < 70,
        coverage_range: 'INR 5 Cr -- 20 Cr',
        reasoning: (assessment.compliance_score || 0) < 50
          ? 'High residual risk. Insurance strongly advised.'
          : 'Moderate risk. Insurance advisable during remediation.',
      },
      implementation_timeline: {
        short_term: {
          label: '0-3 months',
          items: report.recommendations?.filter(r => r.horizon === 'short').length || 0,
          cost_inr: report.recommendations?.filter(r => r.horizon === 'short').reduce((s, r) => s + (r.cost_inr || 0), 0),
        },
        mid_term: {
          label: '3-6 months',
          items: report.recommendations?.filter(r => r.horizon === 'mid').length || 0,
          cost_inr: report.recommendations?.filter(r => r.horizon === 'mid').reduce((s, r) => s + (r.cost_inr || 0), 0),
        },
        long_term: {
          label: '6-12 months',
          items: report.recommendations?.filter(r => r.horizon === 'long').length || 0,
          cost_inr: report.recommendations?.filter(r => r.horizon === 'long').reduce((s, r) => s + (r.cost_inr || 0), 0),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard (list all assessments for user)
router.get('/', authenticate, async (req, res, next) => {
  try {
    let pgAssessments = [];
    try {
      let result;
      if (req.user.role === 'admin') {
        result = await query(
          `SELECT a.id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                  a.compliance_score, a.risk_level, a.total_questions,
                  a.answered_questions, a.created_at, a.completed_at,
                  o.name AS org_name, o.industry
           FROM assessments a
           JOIN organizations o ON o.id = a.org_id
           ORDER BY a.created_at DESC
           LIMIT 20`
        );
      } else if (req.user.org_id) {
        result = await query(
          `SELECT a.id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                  a.compliance_score, a.risk_level, a.total_questions,
                  a.answered_questions, a.created_at, a.completed_at,
                  o.name AS org_name, o.industry
           FROM assessments a
           JOIN organizations o ON o.id = a.org_id
           WHERE a.org_id = $1
           ORDER BY a.created_at DESC
           LIMIT 20`,
          [req.user.org_id]
        );
      } else {
        result = await query(
          `SELECT a.id, a.framework, a.analysis_depth, a.assessment_type, a.status,
                  a.compliance_score, a.risk_level, a.total_questions,
                  a.answered_questions, a.created_at, a.completed_at,
                  o.name AS org_name, o.industry
           FROM assessments a
           JOIN organizations o ON o.id = a.org_id
           WHERE a.user_id = $1
           ORDER BY a.created_at DESC
           LIMIT 20`,
          [req.user.user_id]
        );
      }
      pgAssessments = result.rows.map(a => ({
        ...a,
        is_agent: a.assessment_type === 'agent_assessment'
      }));
    } catch (dbErr) {
      logger.warn(`PostgreSQL is offline, activating standalone dashboard list fallback: ${dbErr.message}`);
      pgAssessments = [];
    }

    // Also fetch AI Compliance Agent assessments from FastAPI
    let agentAssessments = [];
    try {
      const axios = require('axios');
      const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
      const orgId = req.user.org_id || '';
      const agentRes = await axios.get(`${FASTAPI_URL}/agent/compliance/assessments?org_id=${orgId}`, {
        timeout: 5000,
        headers: { 'X-Internal-Service': 'grc-gateway' }
      });
      
      // Fetch allowed assessment IDs from PostgreSQL under this organization
      const pgAgentCheck = await query(
        "SELECT id FROM assessments WHERE org_id = $1",
        [req.user.org_id]
      );
      const allowedAgentIds = new Set(pgAgentCheck.rows.map(r => String(r.id)));

      agentAssessments = (agentRes.data.assessments || [])
        .filter(a => {
          const matchesOrgId = a.org_id && String(a.org_id) === String(req.user.org_id);
          const matchesPgCheck = allowedAgentIds.has(String(a.id));
          return matchesOrgId || matchesPgCheck;
        })
        .map(a => ({
          ...a,
          is_agent: true
        }));
    } catch (agentErr) {
      // Silently skip — FastAPI may not be running
    }

    const allAssessments = [...agentAssessments, ...pgAssessments];
    res.json({ assessments: allAssessments, total: allAssessments.length, standalone: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
