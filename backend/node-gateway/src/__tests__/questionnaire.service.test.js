jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));

jest.mock('../config/mongo', () => ({
  QuestionBank: {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  },
  AssessmentQuestionnaire: {
    findOneAndUpdate: jest.fn().mockResolvedValue({}),
  },
  AssessmentResponse: {
    findOneAndUpdate: jest.fn().mockResolvedValue({ _id: 'mongo-resp-1' }),
    countDocuments: jest.fn().mockResolvedValue(5),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../modules/scoring/services/scoring.service', () => ({
  calculateScore: jest.fn().mockResolvedValue({ overall_score: 75, domains: [] }),
}));

jest.mock('../modules/mapping/services/mapping.service', () => ({
  getAssessmentMappings: jest.fn().mockResolvedValue(new Map()),
  getCanonicalId: jest.fn((controlRef) => controlRef),
}));

const { query } = require('../config/postgres');
const { QuestionBank, AssessmentResponse } = require('../config/mongo');
const questionnaireService = require('../modules/questionnaire/services/questionnaire.service');

describe('questionnaire.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMixedAssessmentTypes', () => {
    it('returns single type for non-comprehensive depth', async () => {
      const result = await questionnaireService.getMixedAssessmentTypes('risk_assessment', 'org-1', 'quick');
      expect(result).toEqual(['risk_assessment']);
    });

    it('returns mixed types for comprehensive compliance assessment', async () => {
      query.mockResolvedValue({ rows: [{ industry: 'Technology' }] });
      const result = await questionnaireService.getMixedAssessmentTypes('compliance_assessment', 'org-1', 'comprehensive');
      expect(result).toContain('compliance_assessment');
      expect(result).toContain('risk_assessment');
      expect(result).toContain('gap_assessment');
      expect(result).toContain('vendor_assessment');
    });

    it('includes internal_audit for non-vendor-heavy industries', async () => {
      query.mockResolvedValue({ rows: [{ industry: 'Mining' }] });
      const result = await questionnaireService.getMixedAssessmentTypes('compliance_assessment', 'org-1', 'comprehensive');
      expect(result).toContain('internal_audit');
      expect(result).not.toContain('vendor_assessment');
    });

    it('defaults to internal_audit on org lookup failure', async () => {
      query.mockRejectedValue(new Error('DB error'));
      const result = await questionnaireService.getMixedAssessmentTypes('compliance_assessment', 'org-1', 'comprehensive');
      expect(result).toContain('internal_audit');
    });
  });

  describe('getQuestionsForAssessment', () => {
    it('throws if assessment not found', async () => {
      query.mockResolvedValue({ rows: [] });
      await expect(questionnaireService.getQuestionsForAssessment('bad-id')).rejects.toThrow('Assessment not found');
    });

    it('throws if no frameworks linked', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ analysis_depth: 'quick', assessment_type: 'compliance_assessment', org_id: 'o1', user_id: 'u1' }] })
        .mockResolvedValueOnce({ rows: [] }); // no frameworks

      await expect(questionnaireService.getQuestionsForAssessment('a1')).rejects.toThrow('No frameworks linked');
    });

    it('fetches and groups questions from MongoDB', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ analysis_depth: 'quick', assessment_type: 'compliance_assessment', org_id: 'o1', user_id: 'u1' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'ISO/IEC 27001:2022' }] })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      QuestionBank.lean.mockResolvedValue([
        {
          _id: 'qb1',
          question_id: 'q1',
          framework: 'ISO/IEC 27001:2022',
          domain: 'Organizational Controls',
          control_ref: 'A.5.1',
          text: 'Is there a policy?',
          hint: 'Look for document',
          response_options: ['Yes', 'Partial', 'No', 'NA'],
          has_maturity_scale: true,
          evidence_required: ['policy_doc'],
          assessment_types: ['compliance_assessment'],
          depth_levels: ['quick'],
          weight: 1.0,
          critical: true,
        },
        {
          _id: 'qb2',
          question_id: 'q2',
          framework: 'ISO/IEC 27001:2022',
          domain: 'Organizational Controls',
          control_ref: 'A.5.2',
          text: 'Is there a process?',
          hint: 'Check records',
          response_options: ['Yes', 'Partial', 'No', 'NA'],
          has_maturity_scale: true,
          evidence_required: [],
          assessment_types: ['compliance_assessment'],
          depth_levels: ['quick'],
          weight: 0.5,
          critical: false,
        },
      ]);

      const result = await questionnaireService.getQuestionsForAssessment('a1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organizational Controls');
      expect(result[0].controls).toHaveLength(2);
      const controlA51 = result[0].controls.find(c => c.id === 'A.5.1');
      expect(controlA51.questions[0].critical).toBe(true);
    });

    it('uses correct depth filter', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ analysis_depth: 'standard', assessment_type: 'compliance_assessment', org_id: 'o1', user_id: 'u1' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'GDPR' }] })
        .mockResolvedValueOnce({ rows: [] });

      QuestionBank.lean.mockResolvedValue([]);

      await questionnaireService.getQuestionsForAssessment('a2');

      const findCall = QuestionBank.find.mock.calls[0][0];
      expect(findCall.depth_levels.$in).toEqual(['quick', 'standard']);
    });

    it('bypasses depth filter for full assessment mode', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ analysis_depth: 'full', assessment_type: 'compliance_assessment', org_id: 'o1', user_id: 'u1' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'ISO/IEC 27001:2022' }] })
        .mockResolvedValueOnce({ rows: [] });

      QuestionBank.lean.mockResolvedValue([
        { _id: 'qb1', question_id: 'q1', framework: 'ISO/IEC 27001:2022', domain: 'A', control_ref: 'c1', text: 'Q1', response_options: ['Yes', 'No'], has_maturity_scale: true, evidence_required: [], assessment_types: ['compliance_assessment'], depth_levels: ['comprehensive'], weight: 1, critical: false },
        { _id: 'qb2', question_id: 'q2', framework: 'ISO/IEC 27001:2022', domain: 'A', control_ref: 'c2', text: 'Q2', response_options: ['Yes', 'No'], has_maturity_scale: true, evidence_required: [], assessment_types: ['compliance_assessment'], depth_levels: ['quick', 'standard', 'comprehensive'], weight: 1, critical: false },
      ]);

      const result = await questionnaireService.getQuestionsForAssessment('a3');

      const findCall = QuestionBank.find.mock.calls[0][0];
      expect(findCall.depth_levels).toBeUndefined();
      expect(findCall.framework.$in).toContain('ISO/IEC 27001:2022');
      expect(result[0].controls).toHaveLength(2);
    });
  });

  describe('mixQuestionsProportionally', () => {
    it('returns proportional subset when only one assessment type is present', () => {
      const questions = [
        { question_id: 'q1', assessment_types: ['compliance_assessment'], weight: 1 },
        { question_id: 'q2', assessment_types: ['compliance_assessment'], weight: 1 },
      ];
      const result = questionnaireService.mixQuestionsProportionally(questions, ['compliance_assessment']);
      // compliance_assessment proportion is 50%, so ceil(2 * 0.5) = 1
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('mixes multiple assessment types proportionally', () => {
      const questions = [
        { question_id: 'c1', assessment_types: ['compliance_assessment'], weight: 1 },
        { question_id: 'c2', assessment_types: ['compliance_assessment'], weight: 1 },
        { question_id: 'r1', assessment_types: ['risk_assessment'], weight: 1 },
        { question_id: 'g1', assessment_types: ['gap_assessment'], weight: 1 },
      ];
      const result = questionnaireService.mixQuestionsProportionally(questions, ['compliance_assessment', 'risk_assessment', 'gap_assessment']);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('deduplicates questions', () => {
      const questions = [
        { question_id: 'q1', assessment_types: ['compliance_assessment', 'risk_assessment'], weight: 1 },
        { question_id: 'q1', assessment_types: ['compliance_assessment', 'risk_assessment'], weight: 1 },
      ];
      const result = questionnaireService.mixQuestionsProportionally(questions, ['compliance_assessment', 'risk_assessment']);
      expect(result).toHaveLength(1);
    });
  });

  describe('saveResponse', () => {
    it('throws if unauthorized', async () => {
      query.mockResolvedValue({ rows: [] });
      await expect(
        questionnaireService.saveResponse('a1', 'u1', 'q1', { answer_index: 0 })
      ).rejects.toThrow('Unauthorized');
    });

    it('saves dual-write to MongoDB and PostgreSQL', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'a1', assessment_type: 'compliance_assessment' }] })
        .mockResolvedValueOnce({ rows: [] }) // SELECT control_id
        .mockResolvedValueOnce({ rows: [] }) // INSERT/UPDATE responses
        .mockResolvedValueOnce({ rows: [] }); // UPDATE assessments

      const result = await questionnaireService.saveResponse('a1', 'u1', 'q1', {
        answer_index: 0,
        maturity_score: 4,
        answer_text: 'Yes',
        category: 'Security',
        domain: 'Security',
        control: 'C1',
        weight: 1.0,
        critical: false,
        is_na: false,
      });

      expect(AssessmentResponse.findOneAndUpdate).toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO responses'),
        expect.any(Array)
      );
      expect(result.success).toBe(true);
      expect(result.answered_count).toBe(5);
    });

    it('propagates to mapped controls when control mapping exists', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 'a1', assessment_type: 'compliance_assessment' }] })
        .mockResolvedValueOnce({ rows: [{ control_id: 'ctrl-a' }] })
        .mockResolvedValueOnce({ rows: [{ question_id: 'q1' }] }) // related questions (propagation)
        .mockResolvedValueOnce({ rows: [] }) // INSERT responses
        .mockResolvedValueOnce({ rows: [] }); // UPDATE assessments

      await questionnaireService.saveResponse('a1', 'u1', 'q1', {
        answer_index: 1,
        maturity_score: 3,
        domain: 'D1',
        control: 'ctrl-a',
        weight: 1,
        critical: false,
        is_na: false,
      });

      // Should call INSERT INTO responses for each propagated question
      const insertCalls = query.mock.calls.filter(c => c[0].includes('INSERT INTO responses'));
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getResponseStats', () => {
    it('returns stats with domain breakdown', async () => {
      AssessmentResponse.aggregate.mockResolvedValue([
        { _id: 'Security', count: 10, avg_maturity: 3.5, critical_gaps: 2, latest: new Date() },
      ]);
      AssessmentResponse.countDocuments.mockResolvedValue(10);

      const result = await questionnaireService.getResponseStats('a1');

      expect(result.total_responses).toBe(10);
      expect(result.domain_breakdown).toHaveLength(1);
      expect(result.domain_breakdown[0]._id).toBe('Security');
    });
  });
});
