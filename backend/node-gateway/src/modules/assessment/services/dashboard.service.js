const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const scoringService = require('../../scoring/services/scoring.service');
const riskService = require('../../risk/services/risk.service');
const insuranceService = require('../../insurance/services/insurance.service');
const gapAnalysisService = require('./gap_analysis.service');
const { AssessmentResponse, EvidenceFile } = require('../../../config/mongo');

/**
 * Dashboard Service v2
 * Aggregates assessment data with MongoDB-primary reads.
 */
class DashboardService {
  /**
   * Get comprehensive dashboard data for an assessment.
   */
  async getDashboardData(assessmentId, userId) {
    logger.info(`Generating dashboard data for assessment: ${assessmentId}`);

    // 1. Get Assessment Metadata
    const assessResult = await query(
      `SELECT a.*, o.name as organization_name
       FROM assessments a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [assessmentId, userId]
    );

    if (assessResult.rows.length === 0) {
      throw new Error('Assessment not found or unauthorized');
    }

    const assessment = assessResult.rows[0];

    // 2. Get Scoring Data (Overall & Domains)
    const scores = await scoringService.calculateScore(assessmentId);

    // 3. Get Risk Data (Distribution & Top Risks)
    let risks = await riskService.getRisksByAssessment(assessmentId, userId);
    
    // If no risks found, trigger identification (in case it wasn't triggered or failed)
    if (risks.length === 0) {
      logger.info(`No risks found for dashboard ${assessmentId}, triggering identification...`);
      await riskService.identifyRisks(assessmentId);
      risks = await riskService.getRisksByAssessment(assessmentId, userId);
    }

    const riskDistribution = {
      critical: risks.filter(r => r.severity === 'critical').length,
      high: risks.filter(r => r.severity === 'high').length,
      medium: risks.filter(r => r.severity === 'medium').length,
      low: risks.filter(r => r.severity === 'low').length
    };

    // 4. Get Gap Summary
    const gaps = await gapAnalysisService.performAnalysis(assessmentId, userId);

    // 5. Get Trend Data (Previous assessments for the same org/framework)
    const trendResult = await query(
      `SELECT compliance_score, created_at
       FROM assessments
       WHERE org_id = $1 AND framework = $2 AND id != $3 AND status = 'complete'
       ORDER BY created_at ASC
       LIMIT 5`,
      [assessment.org_id, assessment.framework, assessmentId]
    );

    const trends = trendResult.rows.map(r => ({
      date: r.created_at,
      score: r.compliance_score
    }));
    trends.push({ date: assessment.created_at, score: scores.overall_score });

    // 6. Get Activity Feed from MongoDB
    const recentActivity = await AssessmentResponse.find({ assessment_id: assessmentId })
      .sort({ submitted_at: -1 })
      .limit(5)
      .lean();

    const activityFeed = recentActivity.map(a => ({
      question_id: a.question_id,
      domain: a.domain,
      control: a.control,
      answer_index: a.answer_index,
      maturity_score: a.maturity_score,
      is_na: a.is_na,
      submitted_at: a.submitted_at,
    }));

    // 7. Get Domain Progress from MongoDB
    const domainStats = await AssessmentResponse.aggregate([
      { $match: { assessment_id: assessmentId } },
      {
        $group: {
          _id: '$domain',
          answered: { $sum: 1 },
          avg_maturity: { $avg: '$maturity_score' },
          critical_gaps: {
            $sum: { $cond: [{ $and: ['$critical', { $lt: ['$maturity_score', 3] }] }, 1, 0] },
          },
        },
      },
    ]);

    // Get total questions per domain from assessment
    const totalQuestionsResult = await query(
      `SELECT COUNT(*) as total FROM questions q
       JOIN assessment_frameworks af ON q.framework_id = af.framework_id
       WHERE af.assessment_id = $1 AND q.is_active = true`,
      [assessmentId]
    );
    const totalQuestions = parseInt(totalQuestionsResult.rows[0]?.total || 0);

    const domainProgress = domainStats.map(d => ({
      name: d._id || 'General',
      answered: d.answered,
      total: Math.max(d.answered, Math.ceil(totalQuestions / Math.max(domainStats.length, 1))),
      avg_maturity: Math.round(d.avg_maturity * 20),
      critical_gaps: d.critical_gaps,
    }));

    // 8. Evidence Stats from MongoDB
    const evidenceTotal = await EvidenceFile.countDocuments({ assessment_id: assessmentId });

    // 9. Format for Frontend Charts
    return {
      metadata: {
        assessment_id: assessmentId,
        organization: assessment.organization_name,
        framework: assessment.framework,
        assessment_type: assessment.assessment_type || 'compliance_assessment',
        status: assessment.status,
        last_updated: assessment.updated_at,
      },
      stats: {
        compliance_percentage: scores.overall_score,
        total_risks: risks.length,
        total_gaps: gaps.summary.missing_count + gaps.summary.partial_count,
        progress: assessment.total_questions > 0 ? (assessment.answered_questions / assessment.total_questions) * 100 : 0,
      },
      risk_chart: {
        distribution: riskDistribution,
        top_risks: risks.slice(0, 5).map(r => ({
          title: r.title,
          severity: r.severity,
          domain: r.category,
        })),
      },
      compliance_chart: {
        domain_scores: scores.domains,
        trends: trends,
      },
      gap_chart: {
        compliant: gaps.summary.compliant_count,
        partial: gaps.summary.partial_count,
        missing: gaps.summary.missing_count,
      },
      activity: activityFeed,
      domain_progress: domainProgress,
      evidence_stats: {
        total_files: evidenceTotal,
      },
      insurance_readiness: await insuranceService.calculateReadiness(assessmentId, userId),
    };
  }
}

module.exports = new DashboardService();
