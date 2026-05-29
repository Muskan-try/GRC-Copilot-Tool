const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const mappingService = require('../../mapping/services/mapping.service');

const { AssessmentResponse } = require('../../../config/mongo');

/**
 * Insurance Service
 * Evaluates assessment data against standard cyber insurance requirements.
 */
class InsuranceService {
  /**
   * Calculate cyber insurance readiness and recommendations.
   */
  async calculateReadiness(assessmentId, userId) {
    logger.info(`Evaluating cyber insurance for assessment: ${assessmentId}`);

    // 1. Get assessment and organization details
    const assessmentResult = await query(
      `SELECT a.*, o.name as organization_name, o.industry, o.employee_range, o.region
       FROM assessments a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.id = $1 AND a.org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = 'active')`,
      [assessmentId, userId]
    );

    if (assessmentResult.rows.length === 0) return null;
    const assessment = assessmentResult.rows[0];

    // 2. Get assessment frameworks
    const frameworksResult = await query(
      `SELECT f.name FROM frameworks f 
       JOIN assessment_frameworks af ON af.framework_id = f.id 
       WHERE af.assessment_id = $1`,
      [assessmentId]
    );
    const fwNames = frameworksResult.rows.map(r => r.name);

    // 3. Get all standard insurance requirements
    const requirements = await query(
      `SELECT ir.*, c.id as control_id, c.name as control_name, c.domain
       FROM insurance_requirements ir
       LEFT JOIN controls c ON ir.related_control_id = c.id`
    );

    // 4. Get smart mappings
    const mappingMap = await mappingService.getAssessmentMappings(assessmentId);

    // 5. Fetch actual responses from MongoDB
    const mongoResponses = await AssessmentResponse.find({ assessment_id: assessmentId }).lean();
    const responseMap = new Map();
    mongoResponses.forEach(r => responseMap.set(r.question_id, r));

    const readinessResults = [];
    let mandatoryScoreSum = 0;
    let mandatoryCount = 0;
    let optionalScoreSum = 0;
    let optionalCount = 0;

    for (const req of requirements.rows) {
      let score = 0;
      let status = 'missing';

      const relatedQuestions = await query(
        `SELECT q.question_id, q.weight
         FROM questions q
         JOIN controls c ON q.control_id = c.id
         JOIN frameworks f ON c.framework_id = f.id
         WHERE (c.id = $1 OR c.id = ANY($2))
         AND (f.name = ANY($3) OR $3 = '{}')`,
        [
          req.related_control_id, 
          Array.from(mappingMap.get(req.related_control_id) || []),
          fwNames
        ]
      );

      if (relatedQuestions.rows.length > 0) {
        let earned = 0;
        let total = 0;

        for (const q of relatedQuestions.rows) {
          const resp = responseMap.get(q.question_id);
          const weight = parseFloat(q.weight || 1.0);
          
          if (resp && !resp.is_na) {
            total += weight;
            earned += (resp.maturity_score / 5.0) * weight;
          } else if (!resp) {
            total += weight;
          }
        }

        if (total > 0) {
          score = earned / total;
          status = score >= 0.8 ? 'ready' : (score > 0.3 ? 'gap' : 'missing');
        }
      }

      const resultEntry = {
        requirement: req.policy_name,
        details: req.requirement_text,
        mandatory: req.is_mandatory,
        status,
        readiness: Math.round(score * 100)
      };

      readinessResults.push(resultEntry);

      if (req.is_mandatory) {
        mandatoryScoreSum += score;
        mandatoryCount++;
      } else {
        optionalScoreSum += score;
        optionalCount++;
      }
    }

    const uniqueResults = [];
    const seenNames = new Set();
    readinessResults.forEach(r => {
      if (!seenNames.has(r.requirement)) {
        uniqueResults.push(r);
        seenNames.add(r.requirement);
      }
    });

    const mAvg = mandatoryCount > 0 ? (mandatoryScoreSum / mandatoryCount) : 0;
    const oAvg = optionalCount > 0 ? (optionalScoreSum / optionalCount) : 0;
    const overallReadiness = Math.min(100, Math.round((mAvg * 80) + (oAvg * 20)));

    // --- CYBER INSURANCE RECOMMENDATION LOGIC ---
    
    const industry = assessment.industry || 'Other';
    const orgSize = assessment.employee_range || 'Small (1-50)';
    const highRiskIndustries = ['Financial Services', 'Healthcare', 'Technology/Saas', 'Retail/E-commerce', 'Telecommunication'];
    const isHighRisk = highRiskIndustries.includes(industry);
    
    // Recommendation Decision
    let recommendationNeeded = true;
    let reasonForNeed = 'Due to increasing cyber threats and digital dependency, all organizations are recommended to have cyber insurance.';
    
    if (isHighRisk) {
      reasonForNeed = `As a ${industry} provider, your organization handles highly sensitive data and is a prime target for ransomware and data breaches. Cyber insurance is critical for financial protection and incident response support.`;
    } else if (overallReadiness < 50) {
      reasonForNeed = `Your current security maturity (Readiness: ${overallReadiness}%) indicates significant exposure. Insurance provides a necessary financial safety net while you improve your controls.`;
    }

    // Coverage Amount Recommendation (Heuristic)
    // Coverage Amount Recommendation (Heuristic)
    let amountUSD = 1000000;
    
    if (orgSize.includes('Enterprise')) {
      amountUSD = isHighRisk ? 25000000 : 10000000;
    } else if (orgSize.includes('Large')) {
      amountUSD = isHighRisk ? 10000000 : 5000000;
    } else if (orgSize.includes('Medium')) {
      amountUSD = isHighRisk ? 5000000 : 2000000;
    } else {
      amountUSD = isHighRisk ? 2000000 : 1000000;
    }

    // Currency Rates (Mock for Prototype)
    const rates = {
      USD: 1,
      INR: 83.5,
      EUR: 0.94,
      GBP: 0.81,
      SGD: 1.36
    };

    // Determine Default Currency based on Region
    let defaultCurrency = 'USD';
    const region = assessment.region || 'Global';
    if (region.includes('India')) defaultCurrency = 'INR';
    else if (region.includes('European Union')) defaultCurrency = 'EUR';
    else if (region.includes('United Kingdom')) defaultCurrency = 'GBP';
    else if (region.includes('Southeast Asia')) defaultCurrency = 'SGD';

    const formatAmount = (amt, curr) => {
      const converted = amt * (rates[curr] || 1);
      if (curr === 'INR') {
        return `${(converted / 10000000).toFixed(2)} Crores`;
      }
      return `${(converted / 1000000).toFixed(2)} Million`;
    };

    const conversions = {};
    Object.keys(rates).forEach(curr => {
      conversions[curr] = {
        amount: amountUSD * rates[curr],
        formatted: formatAmount(amountUSD, curr),
        symbol: curr === 'INR' ? '₹' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '$'
      };
    });

    // Detailed Reasoning Generation
    let detailedReason = `Based on our evaluation of your ${orgSize.toLowerCase()} organization in the ${industry} sector, a Cyber Liability Insurance policy with a limit of ${conversions[defaultCurrency].formatted} (${defaultCurrency}) is strongly recommended. `;
    
    if (isHighRisk) {
      detailedReason += `The ${industry} industry is a top target for cyber attacks. Insurance is critical to protect against the high costs of data restoration, legal defense, and potential regulatory fines which could otherwise be existential for a ${orgSize.toLowerCase()} firm. `;
    } else {
      detailedReason += `While the ${industry} sector has a lower direct attack frequency, cyber insurance provides a vital safety net against the rising tide of untargeted automated attacks and supply chain compromises. `;
    }

    if (overallReadiness < 60) {
      detailedReason += `Current control readiness of ${overallReadiness}% suggests significant exposure. Insurers often look for 80%+ readiness for preferred rates; securing coverage now protects your balance sheet while you remediate identified gaps in ${uniqueResults.filter(r => r.status !== 'ready').slice(0, 2).map(r => r.requirement).join(', ') || 'key areas'}. `;
    } else {
      detailedReason += `Your solid readiness score of ${overallReadiness}% indicates a proactive security posture, which will help you qualify for lower premiums and broader coverage terms for the recommended ${conversions[defaultCurrency].formatted} limit. `;
    }

    detailedReason += `This coverage should be tailored to address the specific data privacy risks and business continuity requirements of your operations in the ${assessment.region || 'local'} market.`;

    return {
      assessment_id: assessmentId,
      overall_readiness_score: overallReadiness,
      mandatory_readiness: Math.round(mAvg * 100),
      requirements: uniqueResults,
      critical_gaps: uniqueResults.filter(r => r.mandatory && r.status !== 'ready'),
      
      // New Cyber Insurance Details
      cyber_insurance_recommendation: {
        is_recommended: true,
        amount_usd: amountUSD,
        default_currency: defaultCurrency,
        conversions: conversions,
        risk_profile: isHighRisk ? 'High' : (overallReadiness < 60 ? 'Medium-High' : 'Moderate'),
        reasoning: detailedReason,
        conditions: [
          'Coverage should include Ransomware Extortion and Data Restoration.',
          'Third-party liability coverage for data breaches is essential.',
          'Business Interruption coverage is recommended given your industry profile.',
          'Regulatory fines and penalties coverage (where legal) should be evaluated.'
        ]
      },

      recommendations: uniqueResults
        .filter(r => r.status !== 'ready')
        .map(r => ({
          area: r.requirement,
          priority: r.mandatory ? 'Critical' : 'Medium',
          action: `Implement robust ${r.requirement.toLowerCase()} controls to align with insurance underwriting standards and reduce cyber liability.`
        }))
    };
  }
}

module.exports = new InsuranceService();
