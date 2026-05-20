/**
 * Assessment Type Configuration
 * Defines scoring rules, domain weighting, and report focus per assessment type.
 */

const ASSESSMENT_TYPES = {
  risk_assessment: {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    description: 'Identifies, analyzes, and evaluates information security risks.',
    icon: '⚠️',
    color: '#ef4444',
    domain_weights: {
      default: 1.0,
      'Risk Management': 2.0,
      'GOVERN': 1.5,
      'IDENTIFY': 1.5,
      'Security (Common Criteria)': 1.5,
      'Organizational Controls': 1.3,
    },
    scoring: {
      methodology: 'Residual Risk Matrix',
      maturity_to_risk: (maturity, weight, critical) => {
        // Residual risk = (5 - maturity) * weight * (critical ? 1.5 : 1.0)
        const base = (5 - (maturity || 0)) * (weight || 1.0);
        return critical ? base * 1.5 : base;
      },
      thresholds: {
        low: { max: 3.0, label: 'Low Risk', color: '#22c55e' },
        medium: { max: 7.0, label: 'Medium Risk', color: '#f59e0b' },
        high: { max: 12.0, label: 'High Risk', color: '#f87171' },
        critical: { max: 999, label: 'Critical Risk', color: '#ef4444' },
      },
    },
    report_focus: ['risk_heatmap', 'risk_register', 'residual_risk_matrix'],
    gap_strictness: 'normal', // normal thresholds
  },

  gap_assessment: {
    id: 'gap_assessment',
    name: 'Gap Assessment',
    description: 'Identifies deficiencies between current and required control state.',
    icon: '📊',
    color: '#0ea5e9',
    domain_weights: {
      default: 1.0,
    },
    scoring: {
      methodology: 'Weighted Maturity Gap',
      maturity_to_gap: (maturity, weight) => {
        // Gap severity based on maturity
        if (maturity >= 4) return { severity: 'None', score: 0 };
        if (maturity >= 3) return { severity: 'Low', score: 1 * weight };
        if (maturity >= 2) return { severity: 'Medium', score: 2 * weight };
        if (maturity >= 1) return { severity: 'High', score: 3 * weight };
        return { severity: 'Critical', score: 5 * weight };
      },
      thresholds: {
        excellent: { min: 80, label: 'Minimal Gaps', color: '#22c55e' },
        satisfactory: { min: 65, label: 'Minor Gaps', color: '#0ea5e9' },
        moderate: { min: 45, label: 'Moderate Gaps', color: '#f59e0b' },
        poor: { min: 25, label: 'Significant Gaps', color: '#f87171' },
        critical: { min: 0, label: 'Critical Gaps', color: '#ef4444' },
      },
    },
    report_focus: ['gap_analysis', 'remediation_roadmap', 'control_status'],
    gap_strictness: 'strict', // maturity < 3 = gap
  },

  vendor_assessment: {
    id: 'vendor_assessment',
    name: 'Vendor Assessment',
    description: 'Evaluates third-party security and compliance posture.',
    icon: '🤝',
    color: '#8b5cf6',
    domain_weights: {
      default: 1.0,
      'Vendor Management': 2.5,
      'Third-Party Risk': 2.5,
      'Data Security & Protection': 1.8,
      'Access Control & Identity': 1.5,
      'Privacy & Data Protection': 1.5,
      'Incident Response & Continuity': 1.3,
    },
    scoring: {
      methodology: 'Vendor Risk Tier',
      maturity_to_score: (maturity, weight, domain) => {
        // Boost vendor-relevant domains
        const domainBoost = ['Vendor Management', 'Third-Party Risk', 'Data Security & Protection'].some(
          d => (domain || '').toLowerCase().includes(d.toLowerCase())
        ) ? 1.5 : 1.0;
        return ((maturity || 0) / 5.0) * 100 * (weight || 1.0) * domainBoost;
      },
      thresholds: {
        low_risk: { min: 80, label: 'Low Risk Vendor', color: '#22c55e' },
        medium_risk: { min: 60, label: 'Medium Risk Vendor', color: '#f59e0b' },
        high_risk: { min: 40, label: 'High Risk Vendor', color: '#f87171' },
        critical_risk: { min: 0, label: 'Critical Risk Vendor', color: '#ef4444' },
      },
    },
    report_focus: ['vendor_risk_tiers', 'contract_clauses', 'evidence_summary'],
    gap_strictness: 'strict',
  },

  internal_audit: {
    id: 'internal_audit',
    name: 'Internal Audit',
    description: 'Independent evaluation of internal controls and compliance.',
    icon: '🔍',
    color: '#06b6d4',
    domain_weights: {
      default: 1.0,
    },
    scoring: {
      methodology: 'Equal Domain Weighting',
      maturity_to_score: (maturity, weight) => {
        return ((maturity || 0) / 5.0) * 100 * (weight || 1.0);
      },
      thresholds: {
        excellent: { min: 80, label: 'Fully Compliant', color: '#22c55e' },
        satisfactory: { min: 65, label: 'Largely Compliant', color: '#0ea5e9' },
        moderate: { min: 45, label: 'Partially Compliant', color: '#f59e0b' },
        poor: { min: 25, label: 'Non-Compliant', color: '#f87171' },
        critical: { min: 0, label: 'Critical Non-Compliance', color: '#ef4444' },
      },
    },
    report_focus: ['full_controls_audit', 'evidence_trace', 'audit_findings'],
    gap_strictness: 'strict',
  },

  compliance_assessment: {
    id: 'compliance_assessment',
    name: 'Compliance Assessment',
    description: 'General compliance maturity evaluation against frameworks.',
    icon: '📋',
    color: '#22c55e',
    domain_weights: {
      default: 1.0,
    },
    scoring: {
      methodology: 'Weighted Maturity Model',
      maturity_to_score: (maturity, weight) => {
        return ((maturity || 0) / 5.0) * 100 * (weight || 1.0);
      },
      thresholds: {
        excellent: { min: 80, label: 'Excellent', color: '#22c55e' },
        satisfactory: { min: 65, label: 'Satisfactory', color: '#0ea5e9' },
        moderate: { min: 45, label: 'Moderate', color: '#f59e0b' },
        poor: { min: 25, label: 'Poor', color: '#f87171' },
        critical: { min: 0, label: 'Critical', color: '#ef4444' },
      },
    },
    report_focus: ['compliance_score', 'domain_breakdown', 'maturity_matrix'],
    gap_strictness: 'normal',
  },
};

function getAssessmentTypeConfig(type) {
  return ASSESSMENT_TYPES[type] || ASSESSMENT_TYPES.compliance_assessment;
}

function getDomainWeight(domain, assessmentType) {
  const config = getAssessmentTypeConfig(assessmentType);
  const weights = config.domain_weights || {};
  // Try exact match first
  if (weights[domain]) return weights[domain];
  // Try partial match
  for (const [key, value] of Object.entries(weights)) {
    if (key !== 'default' && domain.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return weights.default || 1.0;
}

function calculateScoreForType(maturity, weight, domain, assessmentType, critical = false) {
  const config = getAssessmentTypeConfig(assessmentType);
  const domainWeight = getDomainWeight(domain, assessmentType);

  switch (config.id) {
    case 'risk_assessment':
      return config.scoring.maturity_to_risk(maturity, weight || 1.0, critical);
    case 'vendor_assessment':
      // Return base score (0-100), weight applied during aggregation
      return ((maturity || 0) / 5.0) * 100;
    default:
      // Return base score (0-100), weight applied during aggregation
      return ((maturity || 0) / 5.0) * 100;
  }
}

function getStatusFromScore(score, assessmentType) {
  const config = getAssessmentTypeConfig(assessmentType);
  // Rely on insertion order: min-based thresholds are defined highest-to-lowest,
  // max-based thresholds are defined lowest-to-highest.
  const thresholds = Object.entries(config.scoring.thresholds);

  for (const [key, value] of thresholds) {
    if (value.min !== undefined && score >= value.min) {
      return { status: value.label, color: value.color, key };
    }
    if (value.max !== undefined && score <= value.max) {
      return { status: value.label, color: value.color, key };
    }
  }

  return { status: 'Unknown', color: '#94a3b8', key: 'unknown' };
}

function getGapSeverity(maturity, strictness) {
  if (strictness === 'strict') {
    if (maturity >= 4) return 'None';
    if (maturity >= 3) return 'Low';
    if (maturity >= 2) return 'Medium';
    if (maturity >= 1) return 'High';
    return 'Critical';
  }
  // normal
  if (maturity >= 4) return 'None';
  if (maturity >= 2) return 'Low';
  if (maturity >= 1) return 'Medium';
  return 'High';
}

module.exports = {
  ASSESSMENT_TYPES,
  getAssessmentTypeConfig,
  getDomainWeight,
  calculateScoreForType,
  getStatusFromScore,
  getGapSeverity,
};
