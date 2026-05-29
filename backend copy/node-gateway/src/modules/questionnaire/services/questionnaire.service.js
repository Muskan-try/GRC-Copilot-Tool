const { query } = require('../../../config/postgres');
const logger = require('../../../config/logger');
const scoringService = require('../../scoring/services/scoring.service');
const mappingService = require('../../mapping/services/mapping.service');
const { QuestionBank, AssessmentQuestionnaire, AssessmentResponse } = require('../../../config/mongo');

// Map frontend/DB framework names to QuestionBank framework names
const FRAMEWORK_MAP = {
  "GDPR": "GDPR",
  "DPDPA": "DPDP Act",
  "DPDPA (India)": "DPDP Act",
  "CCPA": "CCPA",
  "CCPA/CPRA": "CCPA",
  "HIPAA": "HIPAA",
  "HIPAA Security Rule": "HIPAA",
  "ISO/IEC 27001": "ISO/IEC 27001",
  "ISO/IEC 27001:2022": "ISO/IEC 27001",
  "ISO/IEC 27002": "ISO/IEC 27002",
  "ISO/IEC 27701": "ISO/IEC 27701",
  "PCI DSS": "PCI DSS",
  "PCI DSS v4.0": "PCI DSS",
  "SOC 2": "SOC 2",
  "SOC 2 Trust Services Criteria": "SOC 2",
  "FedRAMP": "FedRAMP",
  "NIST CSF": "NIST CSF",
  "NIST CSF 2.0": "NIST CSF",
  "CIS Controls": "CIS Controls",
  "CIS Controls v8": "CIS Controls",
  "COBIT": "COBIT",
  "ISO/IEC 27017": "ISO/IEC 27017",
  "ISO/IEC 27018": "ISO/IEC 27018",
  "CSA CCM": "CSA CCM",
  "ISO 31000": "ISO 31000",
  "NIST RMF": "NIST RMF",
};

/**
 * Questionnaire Service v2
 * MongoDB-primary with PostgreSQL dual-write.
 * Supports mixed question types for comprehensive assessments.
 */
class QuestionnaireService {
  /**
   * Determine mixed assessment types for comprehensive depth.
   * Returns array of assessment types to include.
   */
  async getMixedAssessmentTypes(assessmentType, orgId, depth) {
    if (depth !== 'comprehensive') {
      return [assessmentType];
    }

    // For comprehensive assessments, mix relevant question types
    if (assessmentType === 'compliance_assessment' || assessmentType === 'vendor_assessment' || assessmentType === 'internal_audit') {
      const mixedTypes = ['compliance_assessment', 'risk_assessment', 'gap_assessment', assessmentType];
      
      // If it's internal audit, also include vendor assessment questions and vice versa for maximum coverage
      if (assessmentType === 'internal_audit') mixedTypes.push('vendor_assessment');
      if (assessmentType === 'vendor_assessment') mixedTypes.push('internal_audit');
      
      return [...new Set(mixedTypes)];
    }

    // For other types, just use the specified type
    return [assessmentType];
  }

  /**
   * Fetch and group questions for a given assessment from MongoDB QuestionBank.
   * @param {string} assessmentId - UUID of the assessment.
   * @param {string} userId - UUID of the user.
   */
  async getQuestionsForAssessment(assessmentId, userId) {
    logger.info(`Fetching questions from MongoDB for assessment: ${assessmentId} (user: ${userId})`);

    // 1. Get assessment metadata and verify org access
    const assessmentResult = await query(
      `SELECT a.analysis_depth, a.assessment_type, a.org_id, a.user_id
       FROM assessments a
       WHERE a.id = $1 AND a.org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = 'active')`,
      [assessmentId, userId]
    );
    if (assessmentResult.rows.length === 0) throw new Error('Assessment not found or unauthorized.');

    const { analysis_depth, assessment_type, org_id, user_id } = assessmentResult.rows[0];
    const depth = analysis_depth || 'quick';
    const type = assessment_type || 'compliance_assessment';

    // 2. Get linked frameworks
    const linkedFrameworks = await query(
      `SELECT f.name FROM assessment_frameworks af JOIN frameworks f ON af.framework_id = f.id WHERE af.assessment_id = $1`,
      [assessmentId]
    );
    if (linkedFrameworks.rows.length === 0) throw new Error('No frameworks linked.');
    const frameworkNames = linkedFrameworks.rows.map(r => FRAMEWORK_MAP[r.name] || r.name);

    // 3. Map depth to MongoDB depth_levels
    // 'full' or 'comprehensive' mode bypasses depth filtering to return ALL questions
    const isFullMode = depth === 'full' || depth === 'comprehensive';
    let depthFilter = null;
    if (!isFullMode) {
      const depthMap = { quick: ['quick'], standard: ['quick', 'standard'] };
      depthFilter = depthMap[depth] || ['quick'];
    }

    // 4. Determine assessment types to query
    const assessmentTypes = await this.getMixedAssessmentTypes(type, org_id, depth);
    logger.info(`Querying for assessment types: ${assessmentTypes.join(', ')}`);

    // 5. Query MongoDB QuestionBank
    const mongoQuery = {
      framework: { $in: frameworkNames },
      is_active: true,
    };
    
    // Add depth filter only if not in full/comprehensive mode
    if (depthFilter) {
      mongoQuery.depth_levels = { $in: depthFilter };
    }
    
    // For specific assessment types (vendor/internal), filter by those types
    // unless it's a general compliance assessment which includes all
    if (type !== 'compliance_assessment') {
      mongoQuery.assessment_types = { $in: assessmentTypes };
    }

    let mongoQuestions = await QuestionBank.find(mongoQuery).sort({ weight: -1 }).lean();

    if (isFullMode) {
      logger.info(`Full/Comprehensive mode: returning ALL ${mongoQuestions.length} questions for frameworks: ${frameworkNames.join(', ')}`);
    }

    // 6. Get smart mappings for deduplication
    const mappingMap = await mappingService.getAssessmentMappings(assessmentId);

    // 7. Deduplicate with smart mapping
    const grouped = {};
    const seenMappedControls = new Set();

    mongoQuestions.forEach((q, idx) => {
      const canonicalId = mappingService.getCanonicalId ?
        mappingService.getCanonicalId(q.control_ref, mappingMap) :
        q.control_ref;

      if (seenMappedControls.has(canonicalId)) return;
      seenMappedControls.add(canonicalId);

      const domain = q.domain || 'General';
      const controlId = q.control_ref || 'unassigned';

      if (!grouped[domain]) {
        grouped[domain] = { name: domain, controls: {} };
      }

      if (!grouped[domain].controls[controlId]) {
        grouped[domain].controls[controlId] = {
          id: controlId,
          name: controlId,
          questions: [],
          is_mapped: false,
        };
      }

      grouped[domain].controls[controlId].questions.push({
        id: q._id.toString(),
        question_id: q.question_id,
        text: q.text,
        hint: q.hint,
        options: q.response_options,
        response_type: q.has_maturity_scale ? 'maturity' : 'boolean',
        weight: q.weight,
        critical: q.critical,
        evidence_required: q.evidence_required,
        has_maturity_scale: q.has_maturity_scale,
        assessment_type_tag: q.assessment_types[0], // Primary tag for display
        sequence_index: idx,
      });
    });

    const result = Object.values(grouped).map(domain => ({
      ...domain,
      controls: Object.values(domain.controls)
    }));

    const totalQuestions = result.reduce((acc, domain) => {
      return acc + domain.controls.reduce((cAcc, ctrl) => cAcc + ctrl.questions.length, 0);
    }, 0);

    // 8. Save assessment snapshot to MongoDB
    const flatQuestions = [];
    result.forEach(d => {
      d.controls.forEach(c => {
        c.questions.forEach(q => {
          flatQuestions.push({
            question_id: q.question_id,
            framework: frameworkNames[0],
            domain: d.name,
            control_ref: c.id,
            text: q.text,
            hint: q.hint,
            response_options: q.options,
            has_maturity_scale: q.has_maturity_scale,
            evidence_required: q.evidence_required,
            weight: q.weight,
            critical: q.critical,
            depth_level: depth,
            sequence_index: q.sequence_index,
          });
        });
      });
    });

    await AssessmentQuestionnaire.findOneAndUpdate(
      { assessment_id: assessmentId },
      {
        $set: {
          assessment_id: assessmentId,
          org_id: org_id || '',
          user_id: user_id || '',
          assessment_type: type,
          analysis_depth: depth,
          frameworks: frameworkNames,
          questions: flatQuestions,
          total_questions: totalQuestions,
          status: 'active',
          updated_at: new Date(),
        },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );

    // 9. Update assessment progress in PostgreSQL
    await query(
      'UPDATE assessments SET total_questions = $1, updated_at = NOW() WHERE id = $2',
      [totalQuestions, assessmentId]
    );

    return result;
  }

  /**
   * Mix questions proportionally from different assessment types.
   * Ensures each type gets fair representation.
   */
  mixQuestionsProportionally(questions, assessmentTypes) {
    // Group by assessment type
    const byType = {};
    questions.forEach(q => {
      // Find which assessment type this question matches
      const matchedType = assessmentTypes.find(t => q.assessment_types.includes(t)) || 'compliance_assessment';
      if (!byType[matchedType]) byType[matchedType] = [];
      byType[matchedType].push(q);
    });

    // Define proportions: compliance 50%, risk 20%, gap 20%, vendor/internal 10%
    const proportions = {
      compliance_assessment: 0.50,
      risk_assessment: 0.20,
      gap_assessment: 0.20,
      vendor_assessment: 0.10,
      internal_audit: 0.10,
    };

    const mixed = [];
    const totalTarget = questions.length;

    assessmentTypes.forEach(type => {
      const typeQuestions = byType[type] || [];
      const proportion = proportions[type] || 0.10;
      const count = Math.ceil(totalTarget * proportion);
      
      // Shuffle and take required count
      const shuffled = [...typeQuestions].sort(() => Math.random() - 0.5);
      mixed.push(...shuffled.slice(0, count));
    });

    // Deduplicate by question_id
    const seen = new Set();
    const deduped = [];
    mixed.forEach(q => {
      if (!seen.has(q.question_id)) {
        seen.add(q.question_id);
        deduped.push(q);
      }
    });

    // Sort by weight descending
    deduped.sort((a, b) => (b.weight || 1) - (a.weight || 1));

    logger.info(`Mixed questions: ${deduped.length} (compliance: ${byType.compliance_assessment?.length || 0}, risk: ${byType.risk_assessment?.length || 0}, gap: ${byType.gap_assessment?.length || 0}, vendor/internal: ${(byType.vendor_assessment?.length || 0) + (byType.internal_audit?.length || 0)})`);
    return deduped;
  }

  /**
    * Get all questions for a framework by its name (from MongoDB).
    */
  async getQuestionsByFrameworkName(name) {
    const mappedName = FRAMEWORK_MAP[name] || name;
    const mongoQuestions = await QuestionBank.find({
      framework: mappedName,
      is_active: true,
    }).sort({ weight: -1 }).lean();

    return mongoQuestions.map(q => ({
      id: q.question_id,
      control_id: q.control_ref,
      text: q.text,
      hint: q.hint,
      category: q.domain,
      response_type: q.has_maturity_scale ? 'maturity' : 'boolean',
      weight: q.weight,
      critical: q.critical,
      options: q.response_options,
      evidence_required: q.evidence_required,
    }));
  }

  /**
    * Save assessment response with dual-write: MongoDB (primary) + PostgreSQL (fallback/compat).
    */
  async saveResponse(assessmentId, userId, questionId, responseData) {
    logger.info(`Saving dual-write response for assessment ${assessmentId}, question ${questionId}`);

    const assessResult = await query(
      'SELECT id, assessment_type FROM assessments WHERE id = $1 AND user_id = $2',
      [assessmentId, userId]
    );
    if (assessResult.rows.length === 0) throw new Error('Unauthorized');
    const assessmentType = assessResult.rows[0].assessment_type || 'compliance_assessment';

    const {
      answer_index,
      maturity_score,
      answer_text,
      category,
      domain,
      control,
      weight,
      critical,
      is_na,
    } = responseData;

    // 1. Upsert to MongoDB AssessmentResponse (PRIMARY)
    const mongoResponse = await AssessmentResponse.findOneAndUpdate(
      { assessment_id: assessmentId, question_id: questionId },
      {
        $set: {
          assessment_id: assessmentId,
          user_id: userId,
          question_id: questionId,
          answer_index: answer_index !== undefined ? answer_index : null,
          answer_text: answer_text || '',
          maturity_score: maturity_score !== undefined ? maturity_score : 0,
          domain: domain || category || 'General',
          control: control || '',
          weight: weight || 1.0,
          critical: critical || false,
          is_na: is_na || false,
          updated_at: new Date(),
        },
        $setOnInsert: { submitted_at: new Date() },
      },
      { upsert: true, new: true }
    );

    logger.info(`MongoDB response saved: ${mongoResponse._id}`);

    // 2. Find mapped controls for smart propagation (from PostgreSQL)
    const qInfo = await query('SELECT control_id FROM questions WHERE question_id = $1', [questionId]);
    let allQuestionIds = [questionId];

    if (qInfo.rows.length > 0) {
      const sourceControlId = qInfo.rows[0].control_id;
      const mappingMap = await mappingService.getAssessmentMappings(assessmentId);
      const mappedControlIds = mappingMap.get(sourceControlId) || new Set();
      const allControlIds = [sourceControlId, ...Array.from(mappedControlIds)];

      const relatedQuestions = await query(
        `SELECT DISTINCT q.question_id
         FROM questions q
         JOIN assessment_frameworks af ON q.framework_id = af.framework_id
         WHERE q.control_id = ANY($1) AND af.assessment_id = $2`,
        [allControlIds, assessmentId]
      );
      allQuestionIds = relatedQuestions.rows.map(r => r.question_id);
    }

    // 3. Dual-write to PostgreSQL responses (BACKWARD COMPATIBILITY)
    try {
      logger.info(`Attempting dual-write to PostgreSQL for ${allQuestionIds.length} questions`);
      for (const qid of allQuestionIds) {
        await query(
          `INSERT INTO responses (assessment_id, question_id, answer_index, maturity_score, answer_text, category, is_na, domain, control, critical)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (assessment_id, question_id)
           DO UPDATE SET
              answer_index = EXCLUDED.answer_index,
              maturity_score = EXCLUDED.maturity_score,
              answer_text = EXCLUDED.answer_text,
              category = EXCLUDED.category,
              is_na = EXCLUDED.is_na,
              domain = EXCLUDED.domain,
              control = EXCLUDED.control,
              critical = EXCLUDED.critical,
              submitted_at = NOW()`,
          [assessmentId, qid, answer_index, maturity_score, answer_text, category, is_na || false, domain, control, critical || false]
        );
      }
      logger.info(`Dual-write to PostgreSQL completed for assessment ${assessmentId}`);
    } catch (pgErr) {
      logger.error(`Dual-write to PostgreSQL failed for assessment ${assessmentId}:`, pgErr);
      // Don't throw, we want MongoDB primary to succeed
    }

    // 4. Update progress
    const mongoCount = await AssessmentResponse.countDocuments({ assessment_id: assessmentId });
    await query(
      'UPDATE assessments SET answered_questions = $1, updated_at = NOW() WHERE id = $2',
      [mongoCount, assessmentId]
    );

    // 5. Trigger scoring
    const scores = await scoringService.calculateScore(assessmentId);

    return {
      success: true,
      answered_count: mongoCount,
      propagated_to: allQuestionIds.filter(q => q !== questionId),
      current_scores: scores,
    };
  }

  /**
    * Get latest responses for an assessment (from MongoDB primary).
    */
  async getResponsesForAssessment(assessmentId) {
    return AssessmentResponse.find({ assessment_id: assessmentId })
      .sort({ submitted_at: -1 })
      .lean();
  }

  /**
    * Get response stats for dashboard activity feed.
    */
  async getResponseStats(assessmentId) {
    const stats = await AssessmentResponse.aggregate([
      { $match: { assessment_id: assessmentId } },
      {
        $group: {
          _id: '$domain',
          count: { $sum: 1 },
          avg_maturity: { $avg: '$maturity_score' },
          critical_gaps: {
            $sum: { $cond: [{ $and: ['$critical', { $lt: ['$maturity_score', 3] }] }, 1, 0] },
          },
          latest: { $max: '$submitted_at' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = await AssessmentResponse.countDocuments({ assessment_id: assessmentId });
    const evidenceCount = await AssessmentResponse.aggregate([
      { $match: { assessment_id: assessmentId } },
      { $group: { _id: null, total: { $sum: '$evidence_count' } } },
    ]);

    return {
      total_responses: total,
      total_evidence: evidenceCount[0]?.total || 0,
      domain_breakdown: stats,
    };
  }
}

module.exports = new QuestionnaireService();
