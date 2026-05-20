export const GRC_DOMAINS = {
  governance: {
    id: 'governance',
    name: 'IT Governance & Management',
    description: 'Strategic alignment of IT with business objectives, policy framework, and oversight mechanisms.',
    weight: 0.15,
    controls: [
      { id: 'GOV-01', name: 'Information Security Policy', critical: true },
      { id: 'GOV-02', name: 'Security Organizational Structure', critical: true },
      { id: 'GOV-03', name: 'Risk Management Framework', critical: true },
      { id: 'GOV-04', name: 'Compliance Management Program', critical: false },
      { id: 'GOV-05', name: 'Third-Party Oversight', critical: true }
    ]
  },
  risk_management: {
    id: 'risk_management',
    name: 'Risk Management',
    description: 'Identification, assessment, and mitigation of information security and privacy risks.',
    weight: 0.15,
    controls: [
      { id: 'RISK-01', name: 'Risk Assessment Methodology', critical: true },
      { id: 'RISK-02', name: 'Annual Risk Assessment', critical: true },
      { id: 'RISK-03', name: 'Risk Register Maintenance', critical: true },
      { id: 'RISK-04', name: 'Risk Treatment Plans', critical: false },
      { id: 'RISK-05', name: 'Continuous Risk Monitoring', critical: false }
    ]
  },
  data_security: {
    id: 'data_security',
    name: 'Data Security & Protection',
    description: 'Protection of data through encryption, access controls, and secure handling practices.',
    weight: 0.20,
    controls: [
      { id: 'DATA-01', name: 'Data Classification', critical: true },
      { id: 'DATA-02', name: 'Encryption at Rest', critical: true },
      { id: 'DATA-03', name: 'Encryption in Transit', critical: true },
      { id: 'DATA-04', name: 'Data Loss Prevention', critical: false },
      { id: 'DATA-05', name: 'Secure Data Disposal', critical: true }
    ]
  },
  access_control: {
    id: 'access_control',
    name: 'Access Control & Identity',
    description: 'Management of user identities, authentication, and authorization to systems and data.',
    weight: 0.12,
    controls: [
      { id: 'AC-01', name: 'User Access Management', critical: true },
      { id: 'AC-02', name: 'Privileged Access Management', critical: true },
      { id: 'AC-03', name: 'Multi-Factor Authentication', critical: true },
      { id: 'AC-04', name: 'Periodic Access Reviews', critical: true },
      { id: 'AC-05', name: 'Service Account Management', critical: false }
    ]
  },
  incident_response: {
    id: 'incident_response',
    name: 'Incident Response & Continuity',
    description: 'Processes for detecting, responding to, and recovering from security incidents.',
    weight: 0.12,
    controls: [
      { id: 'IR-01', name: 'Incident Response Plan', critical: true },
      { id: 'IR-02', name: 'Incident Detection & Reporting', critical: true },
      { id: 'IR-03', name: 'Incident Response Procedures', critical: true },
      { id: 'IR-04', name: 'Post-Incident Review', critical: false },
      { id: 'IR-05', name: 'Business Continuity Plan', critical: true },
      { id: 'IR-06', name: 'Disaster Recovery', critical: true }
    ]
  },
  network_security: {
    id: 'network_security',
    name: 'Network Security',
    description: 'Protection of network infrastructure, perimeter security, and secure communications.',
    weight: 0.08,
    controls: [
      { id: 'NET-01', name: 'Firewall Configuration', critical: true },
      { id: 'NET-02', name: 'Network Segmentation', critical: true },
      { id: 'NET-03', name: 'Intrusion Detection/Prevention', critical: false },
      { id: 'NET-04', name: 'VPN & Remote Access', critical: true },
      { id: 'NET-05', name: 'Wireless Security', critical: false }
    ]
  },
  endpoint_security: {
    id: 'endpoint_security',
    name: 'Endpoint & Device Security',
    description: 'Security controls for endpoints, workstations, and mobile devices.',
    weight: 0.06,
    controls: [
      { id: 'END-01', name: 'Endpoint Protection', critical: true },
      { id: 'END-02', name: 'Patch Management', critical: true },
      { id: 'END-03', name: 'Configuration Management', critical: false },
      { id: 'END-04', name: 'Mobile Device Management', critical: false }
    ]
  },
  privacy: {
    id: 'privacy',
    name: 'Privacy & Data Protection',
    description: 'Compliance with privacy regulations and protection of personal data.',
    weight: 0.12,
    controls: [
      { id: 'PRIV-01', name: 'Privacy Policy', critical: true },
      { id: 'PRIV-02', name: 'Consent Management', critical: true },
      { id: 'PRIV-03', name: 'Data Subject Rights', critical: true },
      { id: 'PRIV-04', name: 'Privacy Impact Assessment', critical: false },
      { id: 'PRIV-05', name: 'Data Processing Records', critical: true }
    ]
  },
  vendor_management: {
    id: 'vendor_management',
    name: 'Vendor & Third-Party Risk',
    description: 'Management of risks arising from third-party vendors and service providers.',
    weight: 0.08,
    controls: [
      { id: 'VEND-01', name: 'Vendor Due Diligence', critical: true },
      { id: 'VEND-02', name: 'Vendor Security Assessment', critical: true },
      { id: 'VEND-03', name: 'Contractual Security Terms', critical: true },
      { id: 'VEND-04', name: 'Vendor Monitoring', critical: false },
      { id: 'VEND-05', name: 'Vendor Incident Notification', critical: true }
    ]
  },
  security_operations: {
    id: 'security_operations',
    name: 'Security Operations',
    description: 'Day-to-day security monitoring, vulnerability management, and threat intelligence.',
    weight: 0.08,
    controls: [
      { id: 'SECOPS-01', name: 'Security Monitoring', critical: true },
      { id: 'SECOPS-02', name: 'Vulnerability Scanning', critical: true },
      { id: 'SECOPS-03', name: 'Log Management', critical: false },
      { id: 'SECOPS-04', name: 'Threat Intelligence', critical: false },
      { id: 'SECOPS-05', name: 'Security Metrics & Reporting', critical: false }
    ]
  },
  physical_security: {
    id: 'physical_security',
    name: 'Physical Security',
    description: 'Protection of physical assets, facilities, and infrastructure.',
    weight: 0.04,
    controls: [
      { id: 'PHY-01', name: 'Facility Access Control', critical: true },
      { id: 'PHY-02', name: 'Physical Monitoring', critical: false },
      { id: 'PHY-03', name: 'Environmental Controls', critical: false }
    ]
  },
  hr_security: {
    id: 'hr_security',
    name: 'Human Resources Security',
    description: 'Security practices for employees throughout their employment lifecycle.',
    weight: 0.04,
    controls: [
      { id: 'HR-01', name: 'Pre-Employment Screening', critical: true },
      { id: 'HR-02', name: 'Security Awareness Training', critical: true },
      { id: 'HR-03', name: 'Acceptable Use Policy', critical: false },
      { id: 'HR-04', name: 'Termination Procedures', critical: true }
    ]
  }
};

export const QUICK_ASSESSMENT_QUESTIONS = [
  {
    domain: 'governance',
    control: 'GOV-01',
    question: 'Does your organization have a documented Information Security Policy that is reviewed and approved annually by management?',
    hint: 'Look for a version-controlled policy document with management approval signatures.',
    weight: 3,
    critical: true
  },
  {
    domain: 'governance',
    control: 'GOV-03',
    question: 'Has your organization conducted a formal risk assessment within the last 12 months?',
    hint: 'Review the latest risk assessment report and management sign-off.',
    weight: 3,
    critical: true
  },
  {
    domain: 'data_security',
    control: 'DATA-01',
    question: 'Is sensitive data (PII, financial, health) classified and labeled according to sensitivity levels?',
    hint: 'Check for a data classification policy and evidence of implementation.',
    weight: 2,
    critical: true
  },
  {
    domain: 'data_security',
    control: 'DATA-02',
    question: 'Is sensitive data encrypted at rest using industry-standard encryption (AES-256 or equivalent)?',
    hint: 'Verify encryption settings in databases, file systems, and backup storage.',
    weight: 3,
    critical: true
  },
  {
    domain: 'access_control',
    control: 'AC-03',
    question: 'Is Multi-Factor Authentication (MFA) enforced for all remote access and administrative accounts?',
    hint: 'Verify MFA configuration in your identity provider (Azure AD, Okta, etc.).',
    weight: 3,
    critical: true
  },
  {
    domain: 'access_control',
    control: 'AC-04',
    question: 'Are periodic access reviews performed at least quarterly for all critical systems?',
    hint: 'Look for review logs and evidence of removing inactive accounts.',
    weight: 2,
    critical: true
  },
  {
    domain: 'incident_response',
    control: 'IR-01',
    question: 'Does your organization have a documented Incident Response Plan with defined roles and escalation paths?',
    hint: 'Review the IR plan and check for recent tabletop exercise reports.',
    weight: 3,
    critical: true
  },
  {
    domain: 'incident_response',
    control: 'IR-05',
    question: 'Is a Business Continuity Plan (BCP) in place and tested within the last 12 months?',
    hint: 'Check for the latest BCP test report and any identified improvements.',
    weight: 2,
    critical: true
  },
  {
    domain: 'network_security',
    control: 'NET-01',
    question: 'Are firewalls configured with a default-deny policy (only allow traffic that is explicitly permitted)?',
    hint: 'Review firewall rule bases and configuration standards.',
    weight: 2,
    critical: true
  },
  {
    domain: 'network_security',
    control: 'NET-02',
    question: 'Is network segmentation implemented to isolate sensitive data environments (cardholder data, PII)?',
    hint: 'Review network diagrams and VLAN configurations.',
    weight: 2,
    critical: false
  },
  {
    domain: 'endpoint_security',
    control: 'END-02',
    question: 'Is a formal patch management process in place with critical patches applied within 30 days?',
    hint: 'Review patch compliance reports and deployment timelines.',
    weight: 2,
    critical: true
  },
  {
    domain: 'privacy',
    control: 'PRIV-01',
    question: 'Does your organization have a Privacy Policy that complies with applicable regulations (GDPR, CCPA, DPDPA)?',
    hint: 'Review the privacy policy and check for required disclosures.',
    weight: 3,
    critical: true
  },
  {
    domain: 'privacy',
    control: 'PRIV-03',
    question: 'Are processes in place to handle data subject requests (access, deletion, portability) within regulatory timeframes?',
    hint: 'Look for documented procedures and request tracking logs.',
    weight: 2,
    critical: true
  },
  {
    domain: 'vendor_management',
    control: 'VEND-01',
    question: 'Are security assessments conducted for critical vendors before onboarding?',
    hint: 'Review vendor assessment templates and completed assessments.',
    weight: 2,
    critical: true
  },
  {
    domain: 'vendor_management',
    control: 'VEND-03',
    question: 'Do contracts with critical vendors include security clauses (data protection, audit rights, breach notification)?',
    hint: 'Review standard contract templates and MSA security exhibits.',
    weight: 2,
    critical: true
  },
  {
    domain: 'security_operations',
    control: 'SECOPS-02',
    question: 'Are automated vulnerability scans performed regularly on internal and external networks?',
    hint: 'Check scan reports from tools like Nessus, Qualys, or OpenVAS.',
    weight: 2,
    critical: true
  },
  {
    domain: 'security_operations',
    control: 'SECOPS-01',
    question: 'Are security events from critical systems monitored in real-time (SIEM or equivalent)?',
    hint: 'Verify SIEM dashboards, alert rules, and response procedures.',
    weight: 2,
    critical: false
  },
  {
    domain: 'hr_security',
    control: 'HR-02',
    question: 'Do all employees complete mandatory security awareness training annually?',
    hint: 'Check completion rates from your LMS or training platform.',
    weight: 2,
    critical: true
  },
  {
    domain: 'hr_security',
    control: 'HR-01',
    question: 'Are background checks performed for all new employees and contractors?',
    hint: 'Verify HR onboarding checklists and background verification processes.',
    weight: 2,
    critical: true
  },
  {
    domain: 'physical_security',
    control: 'PHY-01',
    question: 'Is physical access to data centers and server rooms restricted and logged?',
    hint: 'Review badge access logs and visitor sign-in procedures.',
    weight: 1,
    critical: false
  }
];

export const DEEP_ASSESSMENT_QUESTIONS = [
  {
    domain: 'governance',
    control: 'GOV-04',
    question: 'Is there a dedicated compliance management program with regular regulatory updates and gap assessments?',
    hint: 'Look for compliance calendars and recent gap assessment reports.',
    weight: 2
  },
  {
    domain: 'governance',
    control: 'GOV-05',
    question: 'Is there an inventory of all third-party relationships with associated risk classifications?',
    hint: 'Review the vendor registry and risk classification matrix.',
    weight: 2
  },
  {
    domain: 'risk_management',
    control: 'RISK-04',
    question: 'Are risk treatment plans documented with assigned owners and target completion dates?',
    hint: 'Check the risk register for treatment plan details.',
    weight: 2
  },
  {
    domain: 'risk_management',
    control: 'RISK-05',
    question: 'Is there a process for continuous monitoring of emerging threats and vulnerabilities?',
    hint: 'Look for threat intelligence feeds and regular threat assessments.',
    weight: 1
  },
  {
    domain: 'data_security',
    control: 'DATA-04',
    question: 'Is Data Loss Prevention (DLP) implemented to monitor and prevent sensitive data exfiltration?',
    hint: 'Review DLP policy rules and incident logs.',
    weight: 2
  },
  {
    domain: 'access_control',
    control: 'AC-05',
    question: 'Are service accounts managed with unique credentials and documented ownership?',
    hint: 'Review service account inventory and credential management practices.',
    weight: 1
  },
  {
    domain: 'incident_response',
    control: 'IR-04',
    question: 'Are post-incident reviews conducted to identify root causes and preventive measures?',
    hint: 'Look for post-incident reports with lessons learned.',
    weight: 2
  },
  {
    domain: 'network_security',
    control: 'NET-03',
    question: 'Are Intrusion Detection/Prevention Systems (IDS/IPS) deployed and actively monitoring?',
    hint: 'Review IDS/IPS alerts and tuning documentation.',
    weight: 1
  },
  {
    domain: 'network_security',
    control: 'NET-05',
    question: 'Is wireless network security configured with WPA3 or WPA2-Enterprise?',
    hint: 'Verify wireless access point configurations.',
    weight: 1
  },
  {
    domain: 'endpoint_security',
    control: 'END-03',
    question: 'Is there a configuration baseline (CIS, STIG) applied to all endpoints?',
    hint: 'Review baseline compliance reports.',
    weight: 1
  },
  {
    domain: 'endpoint_security',
    control: 'END-04',
    question: 'Is a Mobile Device Management (MDM) solution implemented for corporate and BYOD devices?',
    hint: 'Verify MDM enrollment and policy enforcement.',
    weight: 1
  },
  {
    domain: 'privacy',
    control: 'PRIV-04',
    question: 'Are Privacy Impact Assessments (PIA) conducted for new processes or systems handling personal data?',
    hint: 'Review PIA documentation and approval records.',
    weight: 2
  },
  {
    domain: 'vendor_management',
    control: 'VEND-04',
    question: 'Is there ongoing monitoring of vendor security posture through periodic reassessments?',
    hint: 'Look for reassessment schedules and recent vendor reviews.',
    weight: 1
  },
  {
    domain: 'vendor_management',
    control: 'VEND-05',
    question: 'Do contracts specify breach notification timelines (typically 24-72 hours)?',
    hint: 'Review security exhibit notification clauses.',
    weight: 2
  },
  {
    domain: 'security_operations',
    control: 'SECOPS-03',
    question: 'Are logs from critical systems retained for at least 12 months with appropriate protection?',
    hint: 'Verify log retention policies and storage security.',
    weight: 1
  },
  {
    domain: 'security_operations',
    control: 'SECOPS-04',
    question: 'Is threat intelligence integrated into security monitoring and incident response?',
    hint: 'Look for threat intelligence feeds integration.',
    weight: 1
  },
  {
    domain: 'security_operations',
    control: 'SECOPS-05',
    question: 'Are security metrics tracked and reported to management regularly?',
    hint: 'Review security dashboards and management reports.',
    weight: 1
  },
  {
    domain: 'physical_security',
    control: 'PHY-02',
    question: 'Is there 24/7 physical monitoring through CCTV or security personnel?',
    hint: 'Review physical security monitoring procedures.',
    weight: 1
  },
  {
    domain: 'physical_security',
    control: 'PHY-03',
    question: 'Are environmental controls (fire suppression, climate control) in place for data centers?',
    hint: 'Check environmental monitoring systems.',
    weight: 1
  },
  {
    domain: 'hr_security',
    control: 'HR-03',
    question: 'Do employees acknowledge Acceptable Use Policies (AUP) for IT resources?',
    hint: 'Look for AUP acknowledgment records.',
    weight: 1
  },
  {
    domain: 'hr_security',
    control: 'HR-04',
    question: 'Are formal termination procedures in place including immediate access revocation?',
    hint: 'Review termination checklists and offboarding processes.',
    weight: 2
  }
];

export const MATURITY_LEVELS = [
  { val: 0, label: 'Non-Existent', desc: 'No recognizable process exists', color: '#ef4444' },
  { val: 1, label: 'Initial', desc: 'Ad-hoc and disorganized processes', color: '#f87171' },
  { val: 2, label: 'Developing', desc: 'Basic processes emerging but informal', color: '#fb923c' },
  { val: 3, label: 'Defined', desc: 'Processes documented and standardized', color: '#fcd34d' },
  { val: 4, label: 'Managed', desc: 'Measured, controlled, and continuously improved', color: '#a3e635' },
  { val: 5, label: 'Optimized', desc: 'Automated best practices with metrics-driven improvement', color: '#22c55e' }
];

export const AUDIT_OPTIONS = [
  { val: 5, label: 'Compliant', desc: 'Fully meets the control requirement', color: '#22c55e', icon: '✓' },
  { val: 3, label: 'Partially Compliant', desc: 'Partially implements the control', color: '#f59e0b', icon: '!' },
  { val: 0, label: 'Non-Compliant', desc: 'Does not meet the control requirement', color: '#ef4444', icon: '✕' },
  { val: -1, label: 'Not Applicable', desc: 'Control does not apply to this organization', color: '#94a3b8', icon: '—' }
];

export function getQuestionsForDepth(depth) {
  switch (depth) {
    case 'quick':
      return QUICK_ASSESSMENT_QUESTIONS;
    case 'comprehensive':
    case 'deep':
      return [...QUICK_ASSESSMENT_QUESTIONS, ...DEEP_ASSESSMENT_QUESTIONS];
    default:
      return QUICK_ASSESSMENT_QUESTIONS;
  }
}

export function getDomainById(domainId) {
  return GRC_DOMAINS[domainId];
}

export function calculateWeightedScore(responses, domains) {
  let totalWeight = 0;
  let weightedScore = 0;

  Object.entries(domains).forEach(([domainId, domain]) => {
    const domainQuestions = responses.filter(r => r.domain === domainId);
    if (domainQuestions.length > 0) {
      const domainTotalWeight = domainQuestions.reduce((sum, q) => sum + (q.weight || 1), 0);
      const domainScore = domainQuestions.reduce((sum, q) => sum + ((q.maturity_score || 0) * (q.weight || 1)), 0);
      
      weightedScore += (domainScore / domainTotalWeight) * domain.weight;
      totalWeight += domain.weight;
    }
  });

  return totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
}
