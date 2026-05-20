const axios = require('axios');
const { query } = require('../config/postgres');
const { Report } = require('../config/mongo');
const logger = require('../config/logger');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

async function triggerAnalysis(assessment_id, user_id) {
  logger.info(`Triggering analysis for assessment ${assessment_id}`);

  try {
    // Gather all data needed for analysis
    const assessResult = await query(
      `SELECT a.*, o.name AS org_name, o.industry, o.region, o.employee_range, o.contact_name
       FROM assessments a
       JOIN organizations o ON o.id = a.org_id
       WHERE a.id = $1`,
      [assessment_id]
    );

    if (!assessResult.rows.length) throw new Error('Assessment not found');
    const assessment = assessResult.rows[0];

    const responsesResult = await query(
      'SELECT question_id, answer_index, category FROM responses WHERE assessment_id = $1 ORDER BY submitted_at',
      [assessment_id]
    );

    const evidenceResult = await query(
      'SELECT question_id, COUNT(*) AS count FROM evidence_files WHERE assessment_id = $1 GROUP BY question_id',
      [assessment_id]
    );
    const evidenceMap = {};
    evidenceResult.rows.forEach(r => { evidenceMap[r.question_id] = parseInt(r.count); });

    const riskResult = await query(
      'SELECT risk_id, priority FROM risk_priorities WHERE assessment_id = $1',
      [assessment_id]
    );
    const riskPriorities = {};
    riskResult.rows.forEach(r => { riskPriorities[r.risk_id] = r.priority; });

    const evidenceTotalResult = await query(
      'SELECT COUNT(*) FROM evidence_files WHERE assessment_id = $1',
      [assessment_id]
    );

    // Build payload for FastAPI
    const payload = {
      assessment_id,
      framework: assessment.framework,
      analysis_depth: assessment.analysis_depth,
      organization: {
        name: assessment.org_name,
        industry: assessment.industry,
        region: assessment.region,
        employee_range: assessment.employee_range,
        contact_name: assessment.contact_name,
      },
      responses: responsesResult.rows.map(r => ({
        question_id: r.question_id,
        answer_index: r.answer_index,
        category: r.category,
        evidence_count: evidenceMap[r.question_id] || 0,
      })),
      risk_priorities: riskPriorities,
      evidence_total: parseInt(evidenceTotalResult.rows[0].count),
    };

    // Call FastAPI analysis engine
    const response = await axios.post(`${FASTAPI_URL}/analysis/generate-report`, payload, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json', 'X-Internal-Service': 'grc-gateway' },
    });

    const reportData = response.data;

    // Update assessment with results
    await query(
      `UPDATE assessments
       SET status = 'complete',
           compliance_score = $1,
           risk_level = $2,
           report_id = $3,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $4`,
      [reportData.compliance_score, reportData.risk_level, reportData.report_id, assessment_id]
    );

    logger.info(`Analysis complete for ${assessment_id}. Score: ${reportData.compliance_score}%, Risk: ${reportData.risk_level}`);
    return reportData;

  } catch (err) {
    logger.error(`Analysis failed for ${assessment_id}:`, err.message);

    await query(
      `UPDATE assessments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [assessment_id]
    ).catch(() => {});

    throw err;
  }
}

module.exports = { triggerAnalysis };
