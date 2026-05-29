 /** Section library: each compliance picks an ordered subset (see COMPLIANCE_SECTION_ORDER). */

 export const SECTION_LIBRARY = {
  "data-security": {
    title: "Data Security",
    description:
      "Data Security ensures protection of sensitive data through encryption, secure storage, and vulnerability management practices across its lifecycle.",
    questions: [
      "Are encryption and key management applied consistently for sensitive data at rest and in transit?",
      "Is vulnerability management (scanning, patching, secure configuration) performed on a defined cadence?",
      "Are backups protected, tested, and segregated from production where appropriate?",
    ],
    gapHint:
      "Strengthen data security controls: encryption coverage, vulnerability management, and backup integrity.",
  },

  "incident-response": {
    title: "Incident Response",
    description:
      "Incident Response focuses on identifying, managing, and recovering from security incidents through structured processes and preparedness.",
    questions: [
      "Is there a documented incident response plan with roles, escalation paths, and communication templates?",
      "Are incidents logged, classified, and reviewed for lessons learned?",
      "Are tabletops or drills conducted periodically to validate the response process?",
    ],
    gapHint:
      "Improve incident readiness: formal IR plan, post-incident review, and regular exercises.",
  },

  "supply-chain": {
    title: "Supply Chain",
    description:
      "Supply Chain Security ensures third-party vendors and partners meet required security and compliance standards to reduce external risk exposure.",
    questions: [
      "Are vendors and subprocessors assessed for security and privacy before onboarding?",
      "Are contractual security clauses and right-to-audit provisions in place for critical suppliers?",
    ],
    gapHint:
      "Tighten third-party risk: due diligence, contracts, and ongoing monitoring.",
  },

  privacy: {
    title: "Privacy",
    description:
      "Privacy ensures personal data is collected, processed, and stored in compliance with legal and regulatory requirements.",
    questions: [
      "Are lawful bases for processing documented and communicated where required?",
      "Are data subject rights (access, erasure, portability, etc.) supported with defined processes?",
      "Are privacy impact or transfer assessments conducted when processing is high-risk or cross-border?",
    ],
    gapHint:
      "Address privacy gaps: legal basis, rights handling, and DPIA/TIA practices.",
  },

  "data-governance": {
    title: "Data Governance",
    description:
      "Data Governance ensures proper management, ownership, quality, and lifecycle control of organizational data assets.",
    questions: [
      "Is there an inventory or classification of data assets and owners across the organisation?",
      "Are retention and disposal policies defined and enforced for regulated or sensitive data?",
      "Is oversight in place for data quality, lineage, and access for reporting or analytics?",
    ],
    gapHint:
      "Advance data governance: asset inventory, lifecycle controls, and stewardship.",
  },

  "access-control": {
    title: "Access Control & Identity",
    description:
      "Access Control ensures that only authorized users can access systems and data using mechanisms like least privilege and authentication controls.",
    questions: [
      "Is least-privilege enforced with periodic access reviews for critical systems?",
      "Is multi-factor authentication required for remote access and privileged accounts where applicable?",
    ],
    gapHint:
      "Harden identity and access: reviews, MFA, and privileged access management.",
  },
};

const DEFAULT_ORDER = [
  "data-security",
  "incident-response",
  "supply-chain",
  "privacy",
  "data-governance",
  "access-control",
];

/** Preferred section order by compliance framework (falls back to DEFAULT_ORDER). */
export const COMPLIANCE_SECTION_ORDER = {
  GDPR: ["privacy", "data-governance", "data-security", "incident-response", "supply-chain", "access-control"],
  DPDPA: ["privacy", "data-governance", "data-security", "supply-chain", "incident-response", "access-control"],
  CCPA: ["privacy", "data-governance", "data-security", "supply-chain", "incident-response", "access-control"],
  HIPAA: ["privacy", "data-security", "incident-response", "access-control", "supply-chain", "data-governance"],
  "ISO/IEC 27001": [
    "data-security",
    "access-control",
    "incident-response",
    "data-governance",
    "supply-chain",
    "privacy",
  ],
  "ISO/IEC 27002": [
    "data-security",
    "access-control",
    "incident-response",
    "data-governance",
    "supply-chain",
    "privacy",
  ],
  "ISO/IEC 27701": ["privacy", "data-governance", "data-security", "incident-response", "supply-chain", "access-control"],
  "PCI DSS": ["data-security", "access-control", "supply-chain", "incident-response", "data-governance", "privacy"],
  "SOC 2": ["data-security", "access-control", "incident-response", "data-governance", "privacy", "supply-chain"],
  FedRAMP: ["data-security", "access-control", "incident-response", "data-governance", "supply-chain", "privacy"],
  "NIST CSF": ["data-security", "incident-response", "access-control", "supply-chain", "data-governance", "privacy"],
  "CIS Controls": ["data-security", "access-control", "incident-response", "supply-chain", "data-governance", "privacy"],
  COBIT: ["data-governance", "data-security", "access-control", "incident-response", "supply-chain", "privacy"],
  "ISO/IEC 27017": ["data-security", "supply-chain", "incident-response", "access-control", "privacy", "data-governance"],
  "ISO/IEC 27018": ["privacy", "data-security", "data-governance", "supply-chain", "incident-response", "access-control"],
  "CSA CCM": ["data-security", "supply-chain", "privacy", "access-control", "incident-response", "data-governance"],
  "ISO 31000": ["data-governance", "data-security", "incident-response", "supply-chain", "privacy", "access-control"],
  "NIST RMF": ["data-governance", "data-security", "access-control", "incident-response", "supply-chain", "privacy"],
};

export function getSectionsForCompliance(complianceId) {
  const order = COMPLIANCE_SECTION_ORDER[complianceId] || DEFAULT_ORDER;
  return order
    .filter((id) => SECTION_LIBRARY[id])
    .map((id) => ({
      id,
      title: SECTION_LIBRARY[id].title,
      description: SECTION_LIBRARY[id].description, 
      questions: [...SECTION_LIBRARY[id].questions],
      gapHint: SECTION_LIBRARY[id].gapHint,
    }));
}

export function makeQuestionKey(sectionId, questionIndex) {
  return `${sectionId}__${questionIndex}`;
}

export function parseQuestionKey(key) {
  const sep = "__";
  const i = key.lastIndexOf(sep);
  if (i === -1) return { sectionId: null, questionIndex: NaN };
  return {
    sectionId: key.slice(0, i),
    questionIndex: Number(key.slice(i + sep.length)),
  };
}

export function getTotalQuestionCount(sections) {
  return sections.reduce((n, s) => n + s.questions.length, 0);
}

/** Resolve question text and recommendation for a stored answer key. */
export function lookupQuestion(sections, key) {
  const { sectionId, questionIndex } = parseQuestionKey(key);
  const section = sections.find((s) => s.id === sectionId);
  if (!section || !Number.isFinite(questionIndex)) return null;
  const text = section.questions[questionIndex];
  if (!text) return null;
  return {
    sectionId,
    sectionTitle: section.title,
    sectionDescription: section.description,
    question: text,
    rec: section.gapHint,
  };
}