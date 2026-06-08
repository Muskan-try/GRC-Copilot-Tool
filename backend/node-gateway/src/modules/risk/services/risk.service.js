const { query, verifyAssessmentOwnership } = require('../../../config/postgres');
const logger = require('../../../config/logger');

const { AssessmentResponse } = require('../../../config/mongo');

/**
 * Risk Service
 * Identifies and manages risks identified during assessments.
 */
class RiskService {
  /**
   * Identify and calculate risks for an assessment based on control gaps.
   * @param {string} assessmentId 
   */
  async identifyRisks(assessmentId) {
    logger.info(`Running risk identification engine for assessment: ${assessmentId}`);

    // 1. Get control and question mapping from PostgreSQL
    const controlMapping = await query(
      `SELECT c.id as control_db_id, c.control_id, c.name as control_name, 
              c.domain, c.priority as control_priority,
              q.question_id, q.weight
       FROM controls c
       JOIN frameworks f_ctrl ON c.framework_id = f_ctrl.id
       JOIN questions q ON q.control_id = c.id
       JOIN assessment_frameworks af ON af.assessment_id = $1
       JOIN frameworks f_assess ON af.framework_id = f_assess.id
       WHERE af.assessment_id = $1
         AND (
           f_ctrl.id = f_assess.id 
           OR f_ctrl.name = f_assess.name
           OR (f_ctrl.name = 'DPDP Act' AND f_assess.name = 'DPDPA (India)')
           OR (f_ctrl.name = 'DPDPA (India)' AND f_assess.name = 'DPDP Act')
           OR (f_ctrl.name = 'ISO/IEC 27001' AND f_assess.name = 'ISO/IEC 27001:2022')
           OR (f_ctrl.name = 'ISO/IEC 27001:2022' AND f_assess.name = 'ISO/IEC 27001')
           OR (f_ctrl.name = 'SOC 2' AND f_assess.name = 'SOC 2 Trust Services Criteria')
           OR (f_ctrl.name = 'SOC 2 Trust Services Criteria' AND f_assess.name = 'SOC 2')
         )`,
      [assessmentId]
    );

    if (controlMapping.rows.length === 0) {
      logger.warn(`Risk Engine: No controls found for assessment ${assessmentId}`);
      return [];
    }

    // 2. Fetch actual responses from MongoDB (PRIMARY)
    const mongoResponses = await AssessmentResponse.find({ assessment_id: assessmentId }).lean();
    const responseMap = new Map();
    mongoResponses.forEach(r => responseMap.set(r.question_id, r));

    // 3. Group and calculate gaps at control level
    const controlGroups = {};
    controlMapping.rows.forEach(row => {
      if (!controlGroups[row.control_db_id]) {
        controlGroups[row.control_db_id] = {
          id: row.control_db_id,
          name: row.control_name,
          domain: row.domain,
          priority: row.control_priority,
          earned: 0,
          total: 0
        };
      }

      const response = responseMap.get(row.question_id);
      const weight = parseFloat(row.weight || 1.0);

      if (response && !response.is_na) {
        controlGroups[row.control_db_id].total += weight;
        controlGroups[row.control_db_id].earned += (response.maturity_score / 5.0) * weight;
      } else if (!response) {
        // Unanswered counts as full gap
        controlGroups[row.control_db_id].total += weight;
      }
    });

    const risks = [];
    for (const ctrl of Object.values(controlGroups)) {
      const scorePercentage = ctrl.total > 0 ? (ctrl.earned / ctrl.total) : 0;
      const controlGap = 1 - scorePercentage;

      // Only generate risks for controls with a significant gap (> 20%)
      if (controlGap > 0.2) {
        const impactMap = { 'high': 5, 'medium': 3, 'low': 2 };
        const impact = impactMap[ctrl.priority?.toLowerCase()] || 3;
        
        let likelihood = 1;
        if (controlGap > 0.8) likelihood = 5;
        else if (controlGap > 0.6) likelihood = 4;
        else if (controlGap > 0.4) likelihood = 3;
        else if (controlGap > 0.2) likelihood = 2;

        const riskScore = impact * likelihood;

        let severity = 'low';
        if (riskScore >= 15) severity = 'critical';
        else if (riskScore >= 8) severity = 'high';
        else if (riskScore >= 4) severity = 'medium';

        const riskEntry = {
          assessment_id: assessmentId,
          control_id: ctrl.id,
          title: `Risk: Inadequate controls for ${ctrl.name}`,
          description: `The control gap of ${Math.round(controlGap * 100)}% indicates potential vulnerability in the ${ctrl.domain} domain.`,
          category: ctrl.domain,
          likelihood,
          impact,
          severity,
          status: 'identified'
        };

        const upsertResult = await query(
          `INSERT INTO risks 
           (assessment_id, control_id, title, description, category, likelihood, impact, severity, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (assessment_id, control_id) 
           DO UPDATE SET 
              severity = EXCLUDED.severity,
              likelihood = EXCLUDED.likelihood,
              impact = EXCLUDED.impact,
              description = EXCLUDED.description,
              updated_at = NOW()
           RETURNING *`,
          [
            riskEntry.assessment_id,
            riskEntry.control_id,
            riskEntry.title,
            riskEntry.description,
            riskEntry.category,
            riskEntry.likelihood,
            riskEntry.impact,
            riskEntry.severity,
            riskEntry.status
          ]
        );
        risks.push(upsertResult.rows[0]);
      } else {
        await query(
          'DELETE FROM risks WHERE assessment_id = $1 AND control_id = $2 AND status = \'identified\'',
          [assessmentId, ctrl.id]
        );
      }
    }

    logger.info(`Risk Engine: identified ${risks.length} risks for assessment ${assessmentId}`);
    return risks;
  }

  /**
   * Get all risks for an assessment.
   */
  async getRisksByAssessment(assessmentId, orgId) {
    await verifyAssessmentOwnership(assessmentId, orgId);
    const result = await query(
      `SELECT r.*, c.control_id as control_ref, c.name as control_name
       FROM risks r
       JOIN assessments a ON r.assessment_id = a.id
       LEFT JOIN controls c ON r.control_id = c.id
       WHERE a.id = $1 AND a.org_id = $2
       ORDER BY 
         CASE r.severity 
           WHEN 'critical' THEN 1 
           WHEN 'high' THEN 2 
           WHEN 'medium' THEN 3 
           WHEN 'low' THEN 4 
         END`,
      [assessmentId, orgId]
    );
    return result.rows;
  }

  async updateRiskStatus(riskId, orgId, status, mitigationPlan = null) {
    const check = await query(
      `SELECT a.org_id FROM risks r JOIN assessments a ON r.assessment_id = a.id WHERE r.id = $1`,
      [riskId]
    );
    if (check.rows.length === 0) {
      const err = new Error('Access Denied: Security Violation');
      err.statusCode = 403;
      throw err;
    }
    if (check.rows[0].org_id !== orgId) {
      const err = new Error('Access Denied: Security Violation');
      err.statusCode = 403;
      throw err;
    }

    const result = await query(
      `UPDATE risks 
       SET status = $1, mitigation_plan = COALESCE($2, mitigation_plan), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, mitigationPlan, riskId]
    );
    return result.rows[0];
  }
}

module.exports = new RiskService();
