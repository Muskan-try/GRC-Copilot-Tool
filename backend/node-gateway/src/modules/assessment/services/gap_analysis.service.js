const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const { AssessmentResponse } = require('../../../config/mongo');
const { getAssessmentTypeConfig, getGapSeverity } = require('../../../data/assessmentTypeConfig');

/**
 * Gap Analysis Service v2
 * MongoDB-primary with assessment-type-specific gap strictness.
 */
class GapAnalysisService {
  /**
   * Perform gap analysis for an assessment.
   * @param {string} assessmentId
   * @param {string} userId
   */
  async performAnalysis(assessmentId, userId) {
    logger.info(`Performing gap analysis for assessment: ${assessmentId}`);

    // 1. Verify ownership
    const assessCheck = await query(
      'SELECT id, assessment_type FROM assessments WHERE id = $1 AND (user_id = $2 OR org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = \'active\'))',
      [assessmentId, userId]
    );
    if (assessCheck.rows.length === 0) {
      throw new Error('Assessment not found or unauthorized');
    }

    const assessmentType = assessCheck.rows[0].assessment_type || 'compliance_assessment';
    const typeConfig = getAssessmentTypeConfig(assessmentType);
    const strictness = typeConfig.gap_strictness || 'normal';

    // 2. Read responses from MongoDB (PRIMARY)
    let mongoResponses = await AssessmentResponse.find({ assessment_id: assessmentId }).lean();

    // Fallback to PostgreSQL
    if (!mongoResponses || mongoResponses.length === 0) {
      logger.warn(`No MongoDB responses for gap analysis ${assessmentId}, falling back to PG`);
      const pgResult = await query(
        `SELECT r.question_id, r.maturity_score, r.answer_index, r.category, r.domain, r.control, r.weight, r.critical
         FROM responses r WHERE r.assessment_id = $1`,
        [assessmentId]
      );
      mongoResponses = pgResult.rows.map(r => ({
        question_id: r.question_id,
        maturity_score: r.maturity_score,
        answer_index: r.answer_index,
        domain: r.domain || r.category || 'General',
        control: r.control || '',
        weight: r.weight || 1.0,
        critical: r.critical || false,
        is_na: r.answer_index === 3,
      }));
    }

    // 3. Get all questions for the assessment's frameworks to find missing ones
    const questionsResult = await query(
      `SELECT q.question_id, c.control_id as control_ref, c.domain, q.weight
       FROM questions q
       JOIN assessment_frameworks af ON q.framework_id = af.framework_id
       LEFT JOIN controls c ON q.control_id = c.id
       WHERE af.assessment_id = $1 AND q.is_active = true`,
      [assessmentId]
    );

    const controlMap = {};
    
    // Initialize controlMap with all questions, assuming maturity=0
    questionsResult.rows.forEach(q => {
      const key = q.control_ref || q.question_id;
      if (!controlMap[key]) {
        controlMap[key] = {
          control_ref: key,
          domain: q.domain || 'General',
          maturity_scores: [],
          weights: [],
          critical: false,
        };
      }
    });

    // Populate with actual responses
    mongoResponses.forEach(r => {
      if (r.is_na) return;
      const key = r.control || r.question_id;
      if (!controlMap[key]) {
        controlMap[key] = {
          control_ref: key,
          domain: r.domain || 'General',
          maturity_scores: [],
          weights: [],
          critical: r.critical,
        };
      }
      controlMap[key].maturity_scores.push(r.maturity_score || 0);
      controlMap[key].weights.push(r.weight || 1.0);
      controlMap[key].critical = controlMap[key].critical || r.critical;
    });

    // For any control that had no responses (i.e. maturity_scores is empty), treat as missing (0 maturity)
    Object.values(controlMap).forEach(ctrl => {
      if (ctrl.maturity_scores.length === 0) {
        ctrl.maturity_scores.push(0);
        ctrl.weights.push(1.0);
      }
    });

    const analysis = {
      fully_compliant: [],
      partially_implemented: [],
      missing_controls: [],
      summary: {
        total_controls: Object.keys(controlMap).length,
        compliant_count: 0,
        partial_count: 0,
        missing_count: 0,
      },
      assessment_type: assessmentType,
    };

    Object.values(controlMap).forEach(ctrl => {
      const avgMaturity = ctrl.maturity_scores.reduce((a, b) => a + b, 0) / ctrl.maturity_scores.length;
      const avgWeight = ctrl.weights.reduce((a, b) => a + b, 0) / ctrl.weights.length;
      const score = (avgMaturity / 5.0);
      const severity = getGapSeverity(avgMaturity, strictness);

      const controlEntry = {
        ref: ctrl.control_ref,
        domain: ctrl.domain,
        score: parseFloat((score * 100).toFixed(2)),
        maturity: parseFloat(avgMaturity.toFixed(1)),
        weight: parseFloat(avgWeight.toFixed(2)),
        critical: ctrl.critical,
        gap_severity: severity,
        recommendation: this.generateRecommendation(ctrl, score, severity, assessmentType),
      };

      if (severity === 'None') {
        analysis.fully_compliant.push(controlEntry);
        analysis.summary.compliant_count++;
      } else if (severity === 'Low' || severity === 'Medium') {
        analysis.partially_implemented.push(controlEntry);
        analysis.summary.partial_count++;
      } else {
        analysis.missing_controls.push(controlEntry);
        analysis.summary.missing_count++;
      }
    });

    return analysis;
  }

  /**
   * Generate dynamic recommendation based on control gap and assessment type.
   */
  generateRecommendation(control, score, severity, assessmentType) {
    if (severity === 'None') return null;

    const isMissing = severity === 'Critical' || severity === 'High';
    const name = control.control_ref || 'this control';
    const domain = control.domain || 'General';

    let suggested_fix = isMissing
      ? `Establish and document a formal process for ${name}.`
      : `Enhance existing procedures and evidence for ${name} to meet full compliance requirements.`;

    // Assessment-type-specific recommendations
    if (assessmentType === 'risk_assessment') {
      suggested_fix = `Evaluate residual risk for ${name} in ${domain}. Implement compensating controls and document risk acceptance or treatment plans.`;
    } else if (assessmentType === 'vendor_assessment') {
      suggested_fix = `Require vendor to provide evidence of ${name} implementation. Update contractual security clauses and schedule follow-up review.`;
    } else if (assessmentType === 'internal_audit') {
      suggested_fix = `Document audit finding for ${name}. Assign remediation owner and target date. Schedule follow-up validation.`;
    } else if (assessmentType === 'gap_assessment') {
      suggested_fix = `Prioritize ${name} in remediation roadmap. Target maturity level 3+ within 90 days for ${domain} controls.`;
    }

    // Framework-specific overrides
    if (name.includes('S.4') || name.includes('Data Minimization')) {
      suggested_fix = "Implement automated data discovery and classification to identify and minimize personal data collection. Update retention schedules.";
    } else if (name.includes('S.6') || name.includes('Consent')) {
      suggested_fix = "Implement a granular consent management platform (CMP) that records the date, purpose, and language of consent. Ensure easy withdrawal.";
    } else if (name.includes('S.10') || name.includes('DPO')) {
      suggested_fix = "Appoint a designated Data Protection Officer (DPO) based in India. Publish their contact details on the official website and in privacy notices.";
    } else if (name.includes('S.8(6)') || name.includes('Breach')) {
      suggested_fix = "Establish a formal Personal Data Breach Response Plan. Set up 24/7 monitoring and an incident escalation matrix to notify the DP Board within timelines.";
    }

    return {
      issue: isMissing
        ? `Control '${name}' is not implemented (Gap Severity: ${severity}).`
        : `Control '${name}' is only partially implemented (${Math.round(score * 100)}%) (Gap Severity: ${severity}).`,
      suggested_fix,
      remediation_priority: severity,
      impact_domain: domain,
    };
  }
}

module.exports = new GapAnalysisService();
