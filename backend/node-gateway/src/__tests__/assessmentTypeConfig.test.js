const {
  ASSESSMENT_TYPES,
  getAssessmentTypeConfig,
  getDomainWeight,
  calculateScoreForType,
  getStatusFromScore,
  getGapSeverity,
} = require('../data/assessmentTypeConfig');

describe('assessmentTypeConfig', () => {
  describe('getAssessmentTypeConfig', () => {
    it('returns config for all 5 assessment types', () => {
      expect(getAssessmentTypeConfig('risk_assessment').id).toBe('risk_assessment');
      expect(getAssessmentTypeConfig('gap_assessment').id).toBe('gap_assessment');
      expect(getAssessmentTypeConfig('vendor_assessment').id).toBe('vendor_assessment');
      expect(getAssessmentTypeConfig('internal_audit').id).toBe('internal_audit');
      expect(getAssessmentTypeConfig('compliance_assessment').id).toBe('compliance_assessment');
    });

    it('defaults to compliance_assessment for unknown types', () => {
      const config = getAssessmentTypeConfig('unknown_type');
      expect(config.id).toBe('compliance_assessment');
    });

    it('each config has required fields', () => {
      Object.values(ASSESSMENT_TYPES).forEach(config => {
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('domain_weights');
        expect(config).toHaveProperty('scoring');
        expect(config).toHaveProperty('report_focus');
        expect(config).toHaveProperty('gap_strictness');
      });
    });
  });

  describe('getDomainWeight', () => {
    it('returns exact match weight', () => {
      expect(getDomainWeight('Risk Management', 'risk_assessment')).toBe(2.0);
      expect(getDomainWeight('Vendor Management', 'vendor_assessment')).toBe(2.5);
    });

    it('returns partial match weight', () => {
      expect(getDomainWeight('Data Security & Protection', 'vendor_assessment')).toBe(1.8);
      expect(getDomainWeight('GOVERN Functions', 'risk_assessment')).toBe(1.5);
    });

    it('returns default weight when no match', () => {
      expect(getDomainWeight('Random Domain', 'risk_assessment')).toBe(1.0);
      expect(getDomainWeight('Anything', 'compliance_assessment')).toBe(1.0);
    });
  });

  describe('calculateScoreForType', () => {
    it('risk_assessment: returns residual risk (lower maturity = higher risk)', () => {
      expect(calculateScoreForType(0, 1.0, 'X', 'risk_assessment', false)).toBe(5); // (5-0)*1
      expect(calculateScoreForType(5, 1.0, 'X', 'risk_assessment', false)).toBe(0);
      expect(calculateScoreForType(3, 1.0, 'X', 'risk_assessment', true)).toBe(3); // (5-3)*1.5
    });

    it('vendor_assessment: returns base score 0-100 without weight double-application', () => {
      expect(calculateScoreForType(0, 2.0, 'X', 'vendor_assessment')).toBe(0);
      expect(calculateScoreForType(5, 2.0, 'X', 'vendor_assessment')).toBe(100);
      expect(calculateScoreForType(3, 2.0, 'X', 'vendor_assessment')).toBe(60);
    });

    it('compliance_assessment: returns base score 0-100 without weight double-application', () => {
      expect(calculateScoreForType(0, 2.0, 'X', 'compliance_assessment')).toBe(0);
      expect(calculateScoreForType(5, 2.0, 'X', 'compliance_assessment')).toBe(100);
      expect(calculateScoreForType(2, 2.0, 'X', 'compliance_assessment')).toBe(40);
    });

    it('gap_assessment: returns base score 0-100', () => {
      expect(calculateScoreForType(0, 1.0, 'X', 'gap_assessment')).toBe(0);
      expect(calculateScoreForType(5, 1.0, 'X', 'gap_assessment')).toBe(100);
    });

    it('internal_audit: returns base score 0-100', () => {
      expect(calculateScoreForType(0, 1.0, 'X', 'internal_audit')).toBe(0);
      expect(calculateScoreForType(5, 1.0, 'X', 'internal_audit')).toBe(100);
    });
  });

  describe('getStatusFromScore', () => {
    it('compliance_assessment: returns correct status bands', () => {
      expect(getStatusFromScore(85, 'compliance_assessment').key).toBe('excellent');
      expect(getStatusFromScore(70, 'compliance_assessment').key).toBe('satisfactory');
      expect(getStatusFromScore(50, 'compliance_assessment').key).toBe('moderate');
      expect(getStatusFromScore(30, 'compliance_assessment').key).toBe('poor');
      expect(getStatusFromScore(10, 'compliance_assessment').key).toBe('critical');
    });

    it('risk_assessment: returns correct risk bands (max-based)', () => {
      expect(getStatusFromScore(2, 'risk_assessment').key).toBe('low');
      expect(getStatusFromScore(5, 'risk_assessment').key).toBe('medium');
      expect(getStatusFromScore(10, 'risk_assessment').key).toBe('high');
      expect(getStatusFromScore(15, 'risk_assessment').key).toBe('critical');
    });

    it('vendor_assessment: returns correct status bands', () => {
      expect(getStatusFromScore(85, 'vendor_assessment').key).toBe('low_risk');
      expect(getStatusFromScore(65, 'vendor_assessment').key).toBe('medium_risk');
      expect(getStatusFromScore(45, 'vendor_assessment').key).toBe('high_risk');
      expect(getStatusFromScore(20, 'vendor_assessment').key).toBe('critical_risk');
    });
  });

  describe('getGapSeverity', () => {
    it('strict mode: maturity < 3 = gap', () => {
      expect(getGapSeverity(4, 'strict')).toBe('None');
      expect(getGapSeverity(3, 'strict')).toBe('Low');
      expect(getGapSeverity(2, 'strict')).toBe('Medium');
      expect(getGapSeverity(1, 'strict')).toBe('High');
      expect(getGapSeverity(0, 'strict')).toBe('Critical');
    });

    it('normal mode: more lenient thresholds', () => {
      expect(getGapSeverity(4, 'normal')).toBe('None');
      expect(getGapSeverity(3, 'normal')).toBe('Low');
      expect(getGapSeverity(2, 'normal')).toBe('Low');
      expect(getGapSeverity(1, 'normal')).toBe('Medium');
      expect(getGapSeverity(0, 'normal')).toBe('High');
    });
  });
});
