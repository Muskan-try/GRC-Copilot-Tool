/**
 * Assessment Configuration
 * Defines assessment types, depths, and framework mappings for the GRC platform.
 */

const ASSESSMENT_TYPES = {
  internal: {
    id: 'internal',
    name: 'Internal Audit',
    description: 'Comprehensive assessment of internal security controls and compliance posture',
    icon: '🏢',
    color: '#0ea5e9',
    questionCount: 40,
    duration: '45-60 min',
    domains: [
      'governance', 'risk_management', 'data_security', 'access_control',
      'incident_response', 'network_security', 'endpoint_security',
      'security_operations', 'hr_security', 'physical_security'
    ]
  },
  vendor: {
    id: 'vendor',
    name: 'Vendor Assessment',
    description: 'Third-party vendor security and compliance evaluation',
    icon: '🤝',
    color: '#8b5cf6',
    questionCount: 35,
    duration: '30-45 min',
    domains: [
      'vendor_management', 'data_security', 'access_control',
      'incident_response', 'privacy', 'business_continuity'
    ]
  },
  full: {
    id: 'full',
    name: 'Full Assessment',
    description: 'Complete GRC evaluation covering all major compliance frameworks',
    icon: '📋',
    color: '#22c55e',
    questionCount: 60,
    duration: '60-90 min',
    domains: [
      'governance', 'risk_management', 'data_security', 'access_control',
      'incident_response', 'network_security', 'endpoint_security',
      'security_operations', 'vendor_management', 'privacy',
      'hr_security', 'physical_security'
    ]
  }
};

const ASSESSMENT_DEPTHS = {
  quick: {
    id: 'quick',
    name: 'Quick Scan',
    description: 'Fast assessment covering critical controls only',
    questionMultiplier: 0.35,
    estimatedTime: '10-15 min',
    targetAudience: 'C-suite executives, initial risk screening',
    color: '#22c55e',
    features: [
      'Critical control verification',
      'High-level risk score',
      'Quick wins identification',
      'Executive summary report'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Standard Assessment',
    description: 'Balanced assessment with comprehensive coverage',
    questionMultiplier: 0.65,
    estimatedTime: '30-45 min',
    targetAudience: 'Compliance officers, IT managers',
    color: '#0ea5e9',
    features: [
      'All critical and high-priority controls',
      'Domain-wise scoring',
      'Gap analysis',
      'Detailed recommendations'
    ]
  },
  comprehensive: {
    id: 'comprehensive',
    name: 'Comprehensive',
    description: 'In-depth evaluation for complete compliance picture',
    questionMultiplier: 1.0,
    estimatedTime: '60-90 min',
    targetAudience: 'Internal auditors, security professionals',
    color: '#8b5cf6',
    features: [
      'Full control coverage',
      'Evidence-based verification',
      'Framework mapping',
      'Remediation roadmap'
    ]
  }
};

const FRAMEWORK_MAPPINGS = {
  'GDPR': {
    regions: ['EU', 'EEA', 'UK'],
    requirements: ['Data Privacy', 'Data Subject Rights', 'Breach Notification'],
    questions: ['gdpr-lb-*', 'gdpr-cm-*', 'gdpr-dsr-*', 'gdpr-bn-*', 'gdpr-rop-*'],
    weight: 1.5
  },
  'DPDPA': {
    regions: ['India'],
    requirements: ['Data Privacy', 'Consent Management', 'Data Fiduciary Obligations'],
    questions: ['dpdp-dm-*', 'dpdp-con-*', 'dpdp-dpr-*', 'dpdp-bn-*'],
    weight: 1.5
  },
  'CCPA': {
    regions: ['California', 'USA'],
    requirements: ['Consumer Rights', 'Sale Opt-Out', 'Notice Requirements'],
    questions: ['ccpa-cr-*', 'ccpa-nc-*', 'ccpa-vf-*'],
    weight: 1.3
  },
  'HIPAA': {
    regions: ['USA'],
    requirements: ['PHI Protection', 'Security Safeguards', 'Breach Notification'],
    questions: ['hipaa-as-*', 'hipaa-ts-*', 'hipaa-ps-*', 'hipaa-bn-*'],
    weight: 1.5
  },
  'ISO/IEC 27001': {
    regions: ['Global'],
    requirements: ['ISMS', 'Risk Management', 'Access Control', 'Operations Security'],
    questions: ['iso-gov-*', 'iso-risk-*', 'iso-acc-*', 'iso-ops-*', 'iso-inc-*'],
    weight: 1.4
  },
  'ISO/IEC 27002': {
    regions: ['Global'],
    requirements: ['Security Controls', 'Physical Security', 'Network Security'],
    questions: ['iso27002-ps-*', 'iso27002-ns-*', 'iso27002-mp-*', 'iso27002-lm-*'],
    weight: 1.3
  },
  'PCI DSS': {
    regions: ['Global'],
    requirements: ['Cardholder Data', 'Access Control', 'Network Security'],
    questions: ['pci-ns-*', 'pci-chd-*', 'pci-vm-*', 'pci-ac-*'],
    weight: 1.5
  },
  'SOC 2': {
    regions: ['USA', 'Global'],
    requirements: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
    questions: ['soc2-sec-*', 'soc2-av-*', 'soc2-conf-*'],
    weight: 1.4
  },
  'NIST CSF': {
    regions: ['USA', 'Global'],
    requirements: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
    questions: ['nist-id-*', 'nist-pr-*', 'nist-de-*', 'nist-rs-*', 'nist-rc-*'],
    weight: 1.3
  },
  'CIS Controls': {
    regions: ['Global'],
    requirements: ['Inventory', 'Data Protection', 'Malware Defense', 'Network Monitoring'],
    questions: ['cis-inv-*', 'cis-dp-*', 'cis-md-*', 'cis-nm-*'],
    weight: 1.3
  }
};

const RISK_SCORING = {
  methodology: 'Weighted Maturity Model',
  scales: {
    maturity: {
      0: { label: 'Non-Existent', color: '#ef4444', weight: 0 },
      1: { label: 'Initial', color: '#f87171', weight: 0.2 },
      2: { label: 'Developing', color: '#fb923c', weight: 0.4 },
      3: { label: 'Defined', color: '#fcd34d', weight: 0.6 },
      4: { label: 'Managed', color: '#a3e635', weight: 0.8 },
      5: { label: 'Optimized', color: '#22c55e', weight: 1.0 }
    },
    compliance: {
      5: { label: 'Compliant', color: '#22c55e', score: 100 },
      3: { label: 'Partially Compliant', color: '#f59e0b', score: 50 },
      0: { label: 'Non-Compliant', color: '#ef4444', score: 0 },
      -1: { label: 'Not Applicable', color: '#94a3b8', score: null }
    }
  },
  thresholds: {
    excellent: { min: 80, label: 'Excellent', color: '#22c55e' },
    satisfactory: { min: 65, label: 'Satisfactory', color: '#0ea5e9' },
    moderate: { min: 45, label: 'Moderate', color: '#f59e0b' },
    poor: { min: 25, label: 'Poor', color: '#f87171' },
    critical: { min: 0, label: 'Critical', color: '#ef4444' }
  }
};

const FINANCIAL_IMPACT = {
  currency: 'INR',
  multipliers: {
    critical_control: 150000,
    high_control: 100000,
    medium_control: 50000,
    low_control: 25000
  },
  effortLevels: {
    high: { min: 1000000, label: 'High', months: '6-12' },
    medium: { min: 300000, label: 'Medium', months: '3-6' },
    low: { min: 0, label: 'Low', months: '1-3' }
  }
};

function getAssessmentConfig(type, depth) {
  const typeConfig = ASSESSMENT_TYPES[type] || ASSESSMENT_TYPES.internal;
  const depthConfig = ASSESSMENT_DEPTHS[depth] || ASSESSMENT_DEPTHS.standard;
  
  return {
    ...typeConfig,
    ...depthConfig,
    estimatedQuestions: Math.round(typeConfig.questionCount * depthConfig.questionMultiplier)
  };
}

function getFrameworkConfig(framework) {
  return FRAMEWORK_MAPPINGS[framework] || null;
}

function calculateRiskScore(maturityScore, critical, impact) {
  let baseScore = (maturityScore / 5) * 100;
  
  if (critical) {
    baseScore *= 0.7;
  }
  
  if (impact >= 4) {
    baseScore *= 0.8;
  }
  
  return Math.round(baseScore);
}

function getStatusFromScore(score) {
  const thresholds = Object.entries(RISK_SCORING.thresholds)
    .sort((a, b) => b[1].min - a[1].min);
  
  for (const [key, value] of thresholds) {
    if (score >= value.min) {
      return { status: value.label, color: value.color, key };
    }
  }
  
  return { status: 'Critical', color: '#ef4444', key: 'critical' };
}

function estimateRemediationCost(gaps) {
  let totalCost = 0;
  
  gaps.forEach(gap => {
    const critical = gap.critical || false;
    const weight = gap.weight || 1;
    
    if (critical) {
      totalCost += FINANCIAL_IMPACT.multipliers.critical_control * weight;
    } else if (weight >= 1.3) {
      totalCost += FINANCIAL_IMPACT.multipliers.high_control * weight;
    } else if (weight >= 1.0) {
      totalCost += FINANCIAL_IMPACT.multipliers.medium_control * weight;
    } else {
      totalCost += FINANCIAL_IMPACT.multipliers.low_control * weight;
    }
  });
  
  let effort = 'Low';
  for (const [key, value] of Object.entries(FINANCIAL_IMPACT.effortLevels)) {
    if (totalCost >= value.min) {
      effort = value.label;
    }
  }
  
  return {
    total: totalCost,
    currency: FINANCIAL_IMPACT.currency,
    effort,
    timeline: FINANCIAL_IMPACT.effortLevels[effort.toLowerCase()]?.months || '1-3'
  };
}

module.exports = {
  ASSESSMENT_TYPES,
  ASSESSMENT_DEPTHS,
  FRAMEWORK_MAPPINGS,
  RISK_SCORING,
  FINANCIAL_IMPACT,
  getAssessmentConfig,
  getFrameworkConfig,
  calculateRiskScore,
  getStatusFromScore,
  estimateRemediationCost
};
