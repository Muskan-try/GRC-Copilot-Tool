const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const { AssessmentResponse } = require('../../../config/mongo');
const { getAssessmentTypeConfig, getDomainWeight, calculateScoreForType, getStatusFromScore } = require('../../../data/assessmentTypeConfig');

/**
 * Scoring Service v2
 * MongoDB-primary scoring with assessment-type-specific weighting.
 */
class ScoringService {
  /**
   * Calculate and update scores for an assessment.
   * @param {string} assessmentId
   */
  async calculateScore(assessmentId) {
    logger.info(`Calculating scores for assessment: ${assessmentId}`);

    // 1. Get assessment metadata
    const assessResult = await query(
      `SELECT assessment_type FROM assessments WHERE id = $1`,
      [assessmentId]
    );
    if (assessResult.rows.length === 0) {
      return { overall_score: 0, domains: [] };
    }
    const assessmentType = assessResult.rows[0].assessment_type || 'compliance_assessment';
    const typeConfig = getAssessmentTypeConfig(assessmentType);

    // 2. Read responses from MongoDB (PRIMARY)
    let mongoResponses = await AssessmentResponse.find({ assessment_id: assessmentId }).lean();

    // 3. Fallback to PostgreSQL if MongoDB empty
    if (!mongoResponses || mongoResponses.length === 0) {
      logger.warn(`No MongoDB responses for ${assessmentId}, falling back to PostgreSQL`);
      const pgResult = await query(
        `SELECT question_id, answer_index, maturity_score, category, domain, control, weight, critical
         FROM responses WHERE assessment_id = $1`,
        [assessmentId]
      );
      mongoResponses = pgResult.rows.map(r => ({
        question_id: r.question_id,
        answer_index: r.answer_index,
        maturity_score: r.maturity_score,
        domain: r.domain || r.category || 'General',
        control: r.control || '',
        weight: r.weight || 1.0,
        critical: r.critical || false,
        is_na: r.answer_index === 3,
      }));
    }

    if (mongoResponses.length === 0) {
      return { overall_score: 0, domains: [] };
    }

    const domainScores = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    mongoResponses.forEach(row => {
      if (row.is_na) return; // Skip N/A

      const maturity = row.maturity_score || 0;
      const domain = row.domain || 'General';
      const weight = row.weight || 1.0;
      const critical = row.critical || false;

      // Assessment-type-specific scoring
      const scoreValue = calculateScoreForType(maturity, weight, domain, assessmentType, critical);

      // For most types, scoreValue is a percentage-like score (0-100+ scaled)
      // For risk_assessment, scoreValue is the residual risk (lower is better)
      let normalizedScore;
      if (assessmentType === 'risk_assessment') {
        // Invert: lower risk = higher score
        const maxRisk = 15; // theoretical max
        normalizedScore = Math.max(0, (maxRisk - scoreValue) / maxRisk) * 100;
      } else {
        normalizedScore = scoreValue;
      }

      const domainWeight = getDomainWeight(domain, assessmentType);
      const effectiveWeight = weight * domainWeight;

      totalWeightedScore += normalizedScore * effectiveWeight;
      totalWeight += effectiveWeight;

      if (!domainScores[domain]) {
        domainScores[domain] = { weightedScore: 0, totalWeight: 0, count: 0 };
      }
      domainScores[domain].weightedScore += normalizedScore * effectiveWeight;
      domainScores[domain].totalWeight += effectiveWeight;
      domainScores[domain].count += 1;
    });

    const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

    const aggregatedDomains = Object.entries(domainScores).map(([name, stats]) => ({
      name,
      score: stats.totalWeight > 0 ? (stats.weightedScore / stats.totalWeight) : 0,
      questions: stats.count,
    }));

    const statusInfo = getStatusFromScore(overallScore, assessmentType);

    // 4. Update assessment record in PostgreSQL
    await query(
      `UPDATE assessments
       SET compliance_score = $1,
           risk_level = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [parseFloat(overallScore.toFixed(2)), statusInfo.status, assessmentId]
    );

    // 5. Trigger Risk Engine synchronously
    try {
      const riskService = require('../../risk/services/risk.service');
      await riskService.identifyRisks(assessmentId);
    } catch (riskErr) {
      logger.error(`Risk identification failed for assessment ${assessmentId}:`, riskErr);
    }

    return {
      overall_score: parseFloat(overallScore.toFixed(2)),
      status: statusInfo,
      domains: aggregatedDomains,
    };
  }

  /**
   * Helper to determine gap severity
   */
  calculateGap(scorePercentage) {
    if (scorePercentage >= 0.9) return 'None';
    if (scorePercentage >= 0.7) return 'Low';
    if (scorePercentage >= 0.4) return 'Medium';
    return 'High';
  }
}

module.exports = new ScoringService();
