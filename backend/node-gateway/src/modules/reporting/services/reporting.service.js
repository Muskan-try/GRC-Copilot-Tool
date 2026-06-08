const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const scoringService = require('../../scoring/services/scoring.service');
const riskService = require('../../risk/services/risk.service');
const insuranceService = require('../../insurance/services/insurance.service');
const gapAnalysisService = require('../../assessment/services/gap_analysis.service');
const assessmentService = require('../../assessment/services/assessment.service');
const { AssessmentResponse, EvidenceFile, AssessmentQuestionnaire } = require('../../../config/mongo');
const { getAssessmentTypeConfig, getStatusFromScore } = require('../../../data/assessmentTypeConfig');

/**
 * Reporting Service v2
 * Orchestrates comprehensive report generation with MongoDB-primary reads.
 */
class ReportingService {
  /**
   * Generate a structured JSON report for an assessment.
   */
  async generateReportData(assessmentId, orgId) {
    logger.info(`Generating CISO-ready report data for assessment: ${assessmentId}`);

    const axios = require('axios');
    const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

    // 1. Gather all required data
    const assessment = await assessmentService.getAssessment(assessmentId, orgId);
    if (!assessment) throw new Error('Assessment not found or unauthorized');

    const assessmentType = assessment.assessment_type || 'compliance_assessment';
    const typeConfig = getAssessmentTypeConfig(assessmentType);

    // 2. Fetch ALL questionnaire responses from MongoDB (PRIMARY)
    let responses = await AssessmentResponse.find({ assessment_id: assessmentId })
      .sort({ submitted_at: 1 })
      .lean();

    // Fallback to PostgreSQL
    if (!responses || responses.length === 0) {
      logger.warn(`No MongoDB responses for report ${assessmentId}, falling back to PG`);
      const responsesResult = await query(
        `SELECT r.question_id, r.answer_index, r.maturity_score, r.answer_text, r.category,
                r.audit_answer, r.is_na, r.domain, r.control, r.weight, r.critical,
                r.submitted_at
         FROM responses r
         WHERE r.assessment_id = $1
         ORDER BY r.submitted_at ASC`,
        [assessmentId]
      );
      responses = responsesResult.rows;
    }

    const totalQuestions = responses.length;

    // 3. Calculate real scores from actual responses
    const totalWeight = responses.reduce((sum, r) => sum + (parseFloat(r.weight) || 1), 0);
    const weightedScore = responses.reduce((sum, r) => {
      const score = r.maturity_score || 0;
      return sum + (score * (parseFloat(r.weight) || 1));
    }, 0);
    const scoreDataResult = await scoringService.calculateScore(assessmentId);
    const scoreData = {
      overall_score: scoreDataResult.overall_score,
      status: scoreDataResult.status?.status || 'Active',
      status_color: scoreDataResult.status?.color || '#94a3b8',
      answered: responses.length,
      total: responses.length,
      average_maturity: responses.length > 0 ? (weightedScore / responses.length).toFixed(1) : "0.0",
    };

    // 4. Calculate domain breakdown from actual responses
    const domainBreakdown = this.calculateDomainBreakdown(responses);

    // 5. Identify gaps from actual responses
    const gapData = this.identifyGaps(responses, assessmentType);

    // 6. Calculate financial implications
    const financialSummary = this.calculateFinancialSummary(gapData);

    // 7. Get insurance readiness
    const insuranceReadiness = await insuranceService.calculateReadiness(assessmentId, orgId);

    // 8. Get evidence count from MongoDB
    const evidenceCount = await EvidenceFile.countDocuments({ assessment_id: assessmentId });

    // 8a. Get Questionnaire snapshot to provide question text and hints to FastAPI
    const questionnaire = await AssessmentQuestionnaire.findOne({ assessment_id: assessmentId }).lean();
    const questionMap = {};
    if (questionnaire && questionnaire.questions) {
      questionnaire.questions.forEach(q => {
        questionMap[q.question_id] = { text: q.text, hint: q.hint };
      });
    }

    // 8b. Fetch uploaded policies (evidence files) and their matching response scores
    const policiesResult = await query(
      `SELECT ef.id, ef.original_name as filename, ef.question_id, ef.file_size, ef.uploaded_at,
              r.maturity_score, r.answer_text, c.name as control_name, c.domain
       FROM evidence_files ef
       LEFT JOIN responses r ON ef.assessment_id = r.assessment_id AND ef.question_id = r.question_id
       LEFT JOIN controls c ON r.control_id = c.id
       WHERE ef.assessment_id = $1
       ORDER BY ef.uploaded_at DESC`,
      [assessmentId]
    ).catch(() => ({ rows: [] }));

    const uploadedPolicies = (policiesResult.rows || []).map(p => {
      const score = p.maturity_score !== null && p.maturity_score !== undefined 
        ? Math.round((p.maturity_score / 5) * 100) 
        : 100; // default to 100% compliance if fully approved or fallback
      return {
        id: p.id,
        filename: p.filename,
        control_id: p.question_id || 'N/A',
        control_name: p.control_name || 'General Governance Requirement',
        domain: p.domain || 'Security & Compliance',
        score: score,
        uploaded_at: p.uploaded_at,
        file_size: p.file_size
      };
    });

    // 8c. Fetch GRC Policy Governance Hub policies for the organization
    logger.info(`Fetching policies for org_id: ${assessment.org_id}`);
    
    if (!assessment.org_id) {
      logger.warn(`Assessment ${assessmentId} has no org_id, policies will not be fetched`);
      var policyHubDocuments = [];
    } else {
      let policyHubResult;
      try {
        policyHubResult = await query(
          `SELECT id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, created_at
           FROM policies
           WHERE org_id = $1 AND assessment_id = $2
           ORDER BY created_at DESC`,
          [assessment.org_id, assessmentId]
        );
        logger.info(`Found ${policyHubResult.rowCount || 0} policies for org_id ${assessment.org_id} and assessment ${assessmentId}`);
      } catch (err) {
        logger.error(`Error fetching GRC Policy Hub documents for org_id ${assessment.org_id}:`, err.message);
        policyHubResult = { rows: [] };
      }

      const uniquePolicies = [];
      const seenNames = new Set();
      (policyHubResult.rows || []).forEach(p => {
        if (!seenNames.has(p.policy_name)) {
          seenNames.add(p.policy_name);
          uniquePolicies.push(p);
        }
      });

      var policyHubDocuments = uniquePolicies.map(p => {
        const report = p.ai_analysis_report || {};
        const gaps = Array.isArray(report.gaps) ? report.gaps : [];
        const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
        const score = p.compliance_score !== null && p.compliance_score !== undefined 
          ? parseFloat(p.compliance_score) 
          : 100.0;
        const isAutoFixed = score === 98.4 || (report.is_auto_fixed === true);

        return {
          id: p.id,
          policy_name: p.policy_name,
          policy_type: p.policy_type,
          status: p.status,
          compliance_score: score,
          gaps: gaps.map(g => ({
            title: g.gap_title || g.title || 'Requirement Gap',
            description: g.description || 'Missing or incomplete policy clause.',
            priority: g.priority || 'Medium',
            remediation_plan: g.remediation_plan || ''
          })),
          recommendations: recommendations.map(r => 
            typeof r === 'string' ? r : (r.title || r.description || r)
          ),
          auto_fixed: isAutoFixed,
          created_at: p.created_at
        };
      });
    }

    // 9. Try FastAPI for AI-enhanced analysis, fallback to heuristic
    try {
      const analysisRequest = {
        assessment_id: assessmentId,
        framework: assessment.framework,
        analysis_depth: assessment.analysis_depth,
        assessment_type: assessmentType,
        organization: {
          name: assessment.organization_name,
          industry: assessment.industry,
          region: assessment.region,
          employee_range: assessment.employee_range,
        },
        responses: responses.map(r => ({
          question_id: r.question_id,
          answer_index: r.answer_index,
          maturity_score: r.maturity_score,
          answer_text: r.answer_text,
          category: r.category || r.domain,
          domain: r.domain,
          control: r.control,
          text: questionMap[r.question_id]?.text || '',
          hint: questionMap[r.question_id]?.hint || '',
          weight: parseFloat(r.weight || 1.0),
          critical: r.critical,
        })),
        risk_priorities: {},
        evidence_total: evidenceCount,
        compliance_score: scoreData.overall_score,
      };

      const fastapiResponse = await axios.post(`${FASTAPI_URL}/analysis/generate-report`, analysisRequest, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'grc-gateway'
        }
      });
      return this.mergeReportData(fastapiResponse.data, scoreData, domainBreakdown, gapData, financialSummary, assessmentType, insuranceReadiness, uploadedPolicies, policyHubDocuments);
    } catch (apiErr) {
      logger.error('FastAPI report generation failed, using heuristic fallback:', apiErr.message);

      const risks = await riskService.getRisksByAssessment(assessmentId, orgId);
      const executiveSummary = this.generateExecutiveSummary(assessment, scoreData, risks, gapData, assessmentType);

      return {
        report_metadata: {
          generated_at: new Date().toISOString(),
          assessment_id: assessmentId,
          organization: assessment.organization_name,
          framework: assessment.framework,
          scope: { industry: assessment.industry },
          assessment_type: assessmentType,
          analysis_depth: assessment.analysis_depth,
        },
        executive_summary: executiveSummary,
        compliance_overview: {
          overall_score: scoreData.overall_score,
          status: scoreData.status,
          total_questions: totalQuestions,
          domain_breakdown: domainBreakdown,
          evidence_count: evidenceCount,
        },
        risk_analysis: { risks },
        gap_analysis: gapData,
        financial_summary: financialSummary,
        insurance_readiness: insuranceReadiness,
        recommendations: this.generateRecommendations(responses, domainBreakdown, assessmentType),
        uploaded_policies: uploadedPolicies,
        policy_hub_documents: policyHubDocuments,
      };
    }
  }

  /**
   * Calculate scores from actual questionnaire responses.
   */
  calculateScoresFromResponses(responses, assessmentType) {
    if (!responses || responses.length === 0) {
      return { overall_score: 0, status: 'Not Assessed', answered: 0, total: 0 };
    }

    const totalWeight = responses.reduce((sum, r) => sum + (parseFloat(r.weight) || 1), 0);
    const weightedScore = responses.reduce((sum, r) => {
      const score = r.maturity_score || 0;
      return sum + (score * (parseFloat(r.weight) || 1));
    }, 0);

    const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 20 : 0;
    const overall_score = Math.round(rawScore);

    const statusInfo = getStatusFromScore(overall_score, assessmentType);

    return {
      overall_score,
      status: statusInfo.status,
      status_color: statusInfo.color,
      answered: responses.length,
      total: responses.length,
      average_maturity: (weightedScore / responses.length).toFixed(1),
    };
  }

  /**
   * Calculate domain breakdown from actual responses.
   */
  calculateDomainBreakdown(responses) {
    const domainScores = {};

    responses.forEach(r => {
      const domain = r.domain || r.category || 'General';
      if (!domainScores[domain]) {
        domainScores[domain] = {
          name: domain,
          score: 0,
          weight: 0,
          count: 0,
          critical_gaps: 0,
        };
      }
      const weight = parseFloat(r.weight) || 1;
      domainScores[domain].score += (r.maturity_score || 0) * weight;
      domainScores[domain].weight += weight;
      domainScores[domain].count += 1;
      if (r.critical && (r.maturity_score || 0) < 3) {
        domainScores[domain].critical_gaps += 1;
      }
    });

    return Object.values(domainScores).map(d => ({
      name: d.name,
      score: d.weight > 0 ? Math.round((d.score / d.weight) * 20) : 0,
      questions: d.count,
      critical_gaps: d.critical_gaps,
    })).sort((a, b) => b.score - a.score);
  }

  /**
   * Identify gaps from actual questionnaire responses.
   */
  identifyGaps(responses, assessmentType) {
    const config = getAssessmentTypeConfig(assessmentType);
    const strictness = config.gap_strictness || 'normal';
    const threshold = strictness === 'strict' ? 3 : 2;

    const missing = [];
    const partial = [];
    const compliant = [];

    responses.forEach(r => {
      const score = r.maturity_score || 0;
      const entry = {
        ref: r.control || r.question_id,
        name: r.domain || 'General Control',
        domain: r.domain || r.category,
        score: score * 20,
        weight: r.weight,
        maturity: score,
      };

      if (score === 0) {
        missing.push(entry);
      } else if (score < threshold) {
        partial.push(entry);
      } else {
        compliant.push(entry);
      }
    });

    const summary = {
      compliant_count: compliant.length,
      partial_count: partial.length,
      missing_count: missing.length,
      total_count: responses.length,
      gap_threshold: threshold,
    };

    return {
      summary,
      missing: missing.slice(0, 10),
      partial: partial.slice(0, 10),
      compliant: compliant.slice(0, 10),
    };
  }

  /**
   * Generate recommendations based on actual responses.
  /**
   * Generate data-driven recommendations.
   */
  generateRecommendations(responses, domainBreakdown, assessmentType) {
    const recommendations = [];
    
    // 1. Domain-level recommendations for weak areas
    const sortedDomains = [...domainBreakdown].sort((a, b) => a.score - b.score);
    sortedDomains.slice(0, 4).forEach((domain, idx) => {
      if (domain.score < 70) {
        let suggested_fix = `Prioritize the implementation of fundamental controls in the ${domain.name} domain. Review existing policies and technical safeguards to ensure they meet the minimum requirements of the framework.`;

        if (assessmentType === 'risk_assessment') {
          suggested_fix = `Conduct a targeted risk assessment for ${domain.name}. Implement compensating controls to reduce residual risk and document all risk treatment decisions for management review.`;
        } else if (assessmentType === 'vendor_assessment') {
          suggested_fix = `Initiate a vendor remediation plan for ${domain.name} controls. Request formal evidence of compliance and schedule a follow-up technical review within 60 days.`;
        } else if (assessmentType === 'internal_audit') {
          suggested_fix = `Document a formal audit non-conformity for ${domain.name}. Assign a remediation owner and establish a milestone-based roadmap for control implementation.`;
        }

        recommendations.push({
          id: `DOM-${idx + 1}`,
          issue: `Low Maturity in ${domain.name} (${domain.score}%)`,
          remediation_priority: domain.score < 40 ? 'Critical' : domain.score < 60 ? 'High' : 'Medium',
          impact_domain: domain.name,
          suggested_fix,
          domain_score: domain.score,
          affected_controls: domain.questions,
        });
      }
    });

    // 2. Control-level recommendations for critical gaps
    const criticalGaps = responses.filter(r => r.critical && (r.maturity_score || 0) < 3);
    criticalGaps.forEach((r, idx) => {
      if (recommendations.length < 8) {
        recommendations.push({
          id: `CRIT-${idx + 1}`,
          issue: `Critical Control Failure: ${r.control || r.question_id}`,
          remediation_priority: 'Critical',
          impact_domain: r.domain || r.category,
          suggested_fix: `The control "${r.control || r.question_id}" is marked as critical but is not effectively implemented (Score: ${r.maturity_score}/5). Immediate technical remediation or management exception is required.`,
          domain_score: (r.maturity_score || 0) * 20,
          affected_controls: 1,
        });
      }
    });

    return recommendations.sort((a, b) => {
      const pMap = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4 };
      return pMap[a.remediation_priority] - pMap[b.remediation_priority];
    }).slice(0, 8);
  }

  /**
   * Merge FastAPI response with calculated data.
   */
  mergeReportData(fastapiData, scoreData, domainBreakdown, gapData, financialSummary, assessmentType, insuranceData, uploadedPolicies, policyHubDocuments) {
    return {
      ...fastapiData,
      compliance_score: scoreData.overall_score,
      report_metadata: {
        ...(fastapiData.report_metadata || {}),
        assessment_type: assessmentType,
      },
      compliance_overview: {
        ...(fastapiData.compliance_overview || {}),
        overall_score: scoreData.overall_score,
        status: scoreData.status,
        domain_breakdown: domainBreakdown,
      },
      gap_analysis: gapData,
      financial_summary: financialSummary,
      insurance_readiness: insuranceData,
      uploaded_policies: uploadedPolicies,
      policy_hub_documents: policyHubDocuments,
    };
  }

  /**
   * Internal helper for automated executive summary.
   */
  generateExecutiveSummary(assessment, scores, risks, gaps, assessmentType) {
    const riskCount = risks.filter(r => r.severity === 'critical' || r.severity === 'high').length;
    const score = Math.round(scores.overall_score);
    const orgName = assessment.organization_name || 'the organization';
    const framework = assessment.framework || 'the framework';

    let summary = `This assessment for ${orgName} evaluates security maturity against the ${framework} framework. `;
    summary += `The overall compliance score is calculated at ${score}%, indicating a `;

    if (score >= 80) summary += 'Robust and resilient';
    else if (score >= 60) summary += 'Developing and generally compliant';
    else if (score >= 40) summary += 'High-Risk with significant deficiencies in';
    else summary += 'Critical-Risk with fundamental failures in';

    summary += ` security posture. `;

    if (gaps.summary.missing_count > 0) {
      summary += `The analysis identified ${gaps.summary.missing_count} critical control gaps where no implementation was found. `;
    }

    if (riskCount > 0) {
      summary += `Specifically, ${riskCount} high-priority risks were identified, requiring immediate management oversight. `;
    }

    const weakDomain = gaps.missing[0]?.domain || 'core security';
    summary += `Primary remediation should focus on the ${weakDomain} domain to achieve the most rapid security maturity gains.`;

    return summary;
  }

  /**
   * Calculate financial implications of the current gaps.
   */
  calculateFinancialSummary(gaps) {
    // Costs in USD base (assuming roughly 150000 INR -> ~1775 USD, 50000 INR -> ~591 USD)
    const missingCostUsd = gaps.summary.missing_count * 1775;
    const partialCostUsd = gaps.summary.partial_count * 591;
    const totalUsd = missingCostUsd + partialCostUsd;

    return {
      total_estimated_usd: totalUsd,
      critical_remediation_usd: missingCostUsd,
      currency: 'USD',
      effort_level: totalUsd > 12000 ? 'High' : totalUsd > 3500 ? 'Medium' : 'Low',
    };
  }

  /**
   * Summary of control mappings across frameworks.
   */
  async getControlMappingSummary(assessmentId) {
    const result = await query(
      `SELECT f.name as framework_name, COUNT(af.framework_id) as count
       FROM assessment_frameworks af
       JOIN frameworks f ON af.framework_id = f.id
       WHERE af.assessment_id = $1
       GROUP BY f.name`,
      [assessmentId]
    );
    return result.rows;
  }
}

module.exports = new ReportingService();
