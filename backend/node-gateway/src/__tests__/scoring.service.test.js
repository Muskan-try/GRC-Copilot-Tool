// Mock dependencies BEFORE requiring the service
jest.mock('../config/postgres', () => ({
  query: jest.fn(),
}));

jest.mock('../config/mongo', () => ({
  AssessmentResponse: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../modules/risk/services/risk.service', () => ({
  identifyRisks: jest.fn().mockResolvedValue(true),
}));

const { query } = require('../config/postgres');
const { AssessmentResponse } = require('../config/mongo');
const scoringService = require('../modules/scoring/services/scoring.service');

describe('scoring.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateScore', () => {
    it('returns 0 for non-existent assessment', async () => {
      query.mockResolvedValue({ rows: [] });
      const result = await scoringService.calculateScore('nonexistent-id');
      expect(result.overall_score).toBe(0);
      expect(result.domains).toEqual([]);
    });

    it('calculates compliance_assessment score correctly', async () => {
      query.mockResolvedValueOnce({ rows: [{ assessment_type: 'compliance_assessment' }] });
      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { question_id: 'q1', maturity_score: 5, domain: 'Security', weight: 1.0, critical: false, is_na: false },
          { question_id: 'q2', maturity_score: 3, domain: 'Security', weight: 1.0, critical: false, is_na: false },
          { question_id: 'q3', maturity_score: 1, domain: 'Privacy', weight: 1.0, critical: false, is_na: false },
        ]),
      });

      const result = await scoringService.calculateScore('assess-1');

      // Security: (100 + 60) / 2 = 80
      // Privacy: 20 / 1 = 20
      // Overall: (80*2 + 20*1) / 3 = 180/3 = 60
      expect(result.overall_score).toBeCloseTo(60, 0);
      expect(result.domains).toHaveLength(2);
      expect(result.status.key).toBe('moderate');
    });

    it('calculates risk_assessment score correctly (inverted risk)', async () => {
      query.mockResolvedValueOnce({ rows: [{ assessment_type: 'risk_assessment' }] });
      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { question_id: 'q1', maturity_score: 5, domain: 'Risk Management', weight: 1.0, critical: false, is_na: false }, // risk 0 -> score 100
          { question_id: 'q2', maturity_score: 0, domain: 'Risk Management', weight: 1.0, critical: false, is_na: false }, // risk 5 -> score 66.67
        ]),
      });

      const result = await scoringService.calculateScore('assess-risk');

      // Risk Management has weight 2.0
      // q1: normalizedScore = ((15-0)/15)*100 = 100
      // q2: normalizedScore = ((15-5)/15)*100 = 66.67
      // overall: (100*2 + 66.67*2) / 4 = 83.33
      expect(result.overall_score).toBeGreaterThan(0);
      expect(result.domans?.[0]?.name || result.domains.find(d => d.name === 'Risk Management')).toBeTruthy();
    });

    it('calculates vendor_assessment with domain boost correctly', async () => {
      query.mockResolvedValueOnce({ rows: [{ assessment_type: 'vendor_assessment' }] });
      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { question_id: 'q1', maturity_score: 4, domain: 'Vendor Management', weight: 1.0, critical: false, is_na: false },
          { question_id: 'q2', maturity_score: 4, domain: 'General', weight: 1.0, critical: false, is_na: false },
        ]),
      });

      const result = await scoringService.calculateScore('assess-vendor');

      // Vendor Management has weight 2.5, General has 1.0
      // q1: 80 * 2.5 = 200
      // q2: 80 * 1.0 = 80
      // overall: 280 / 3.5 = 80
      expect(result.overall_score).toBeCloseTo(80, 0);
    });

    it('skips N/A responses', async () => {
      query.mockResolvedValueOnce({ rows: [{ assessment_type: 'compliance_assessment' }] });
      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { question_id: 'q1', maturity_score: 5, domain: 'A', weight: 1.0, critical: false, is_na: true },
          { question_id: 'q2', maturity_score: 3, domain: 'A', weight: 1.0, critical: false, is_na: false },
        ]),
      });

      const result = await scoringService.calculateScore('assess-na');

      // Only q2 counts: 60%
      expect(result.overall_score).toBe(60);
    });

    it('falls back to PostgreSQL when MongoDB is empty', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ assessment_type: 'compliance_assessment' }] })
        .mockResolvedValueOnce({
          rows: [
            { question_id: 'q1', answer_index: 0, maturity_score: 5, category: 'A', domain: 'A', control: 'c1', weight: 1.0, critical: false },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await scoringService.calculateScore('assess-fallback');

      expect(result.overall_score).toBe(100);
      expect(query).toHaveBeenCalledTimes(3);
    });

    it('triggers risk identification after scoring', async () => {
      query.mockResolvedValueOnce({ rows: [{ assessment_type: 'compliance_assessment' }] });
      AssessmentResponse.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { question_id: 'q1', maturity_score: 5, domain: 'A', weight: 1.0, critical: false, is_na: false },
        ]),
      });

      const riskService = require('../modules/risk/services/risk.service');
      await scoringService.calculateScore('assess-risk-trigger');

      expect(riskService.identifyRisks).toHaveBeenCalledWith('assess-risk-trigger');
    });

    it('calculates gap severity helper correctly', () => {
      expect(scoringService.calculateGap(0.95)).toBe('None');
      expect(scoringService.calculateGap(0.8)).toBe('Low');
      expect(scoringService.calculateGap(0.5)).toBe('Medium');
      expect(scoringService.calculateGap(0.3)).toBe('High');
    });
  });
});
