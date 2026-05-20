/**
 * Comprehensive Question Bank — 500+ questions across 18 frameworks
 * Auto-seeded into MongoDB on server startup.
 *
 * Each question has:
 *  - id: unique identifier
 *  - text: the question
 *  - hint: guidance/context
 *  - opts: 4 options from best(0) to worst(3)
 *  - controls: reference control IDs
 *  - depth: which levels include this — 'quick' | 'intermediate' | 'deep'
 *  - weight: scoring multiplier (1.0–1.5)
 */

const QUESTION_BANK = {
  // ─────────────────────────────────────────────────────────────────
  // GDPR — General Data Protection Regulation
  // ─────────────────────────────────────────────────────────────────
  "GDPR": {
    "Lawful Basis": [
      { id: "gdpr-lb-001", text: "Have you identified and documented a lawful basis for each processing activity?", hint: "GDPR Art.6 requires a valid lawful basis (consent, contract, legal obligation, vital interests, public task, or legitimate interest).", opts: ["Yes -- documented for every activity with clear rationale", "Mostly documented but some activities lack clear basis", "Partially identified -- informal understanding only", "No lawful basis identified"], controls: ["Art.6"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-lb-002", text: "Is legitimate interest assessment (LIA) conducted where relied upon as lawful basis?", hint: "When using legitimate interest, a documented LIA must balance your interests against the data subject's rights.", opts: ["Yes -- formal LIA with balancing test and documented outcomes", "LIA conducted but informal or outdated", "Only partially assessed", "No LIA conducted"], controls: ["Art.6(1)(f)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Consent Management": [
      { id: "gdpr-cm-001", text: "Is consent obtained through clear affirmative action (not pre-ticked or implied)?", hint: "GDPR requires explicit, informed, unambiguous consent. Pre-ticked boxes are not valid.", opts: ["Yes -- granular opt-in with clear consent text", "Mostly explicit but some legacy forms use implied consent", "Pre-ticked boxes still in use", "Consent mechanism unclear or absent"], controls: ["Art.4(11)", "Art.7"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-cm-002", text: "Can individuals withdraw consent as easily as they gave it?", hint: "Art.7(3) requires that withdrawal must be as easy as giving consent.", opts: ["Yes -- one-click/simple withdrawal, actioned immediately", "Withdrawal possible but requires extra steps", "Withdrawal process is difficult or unclear", "No withdrawal mechanism exists"], controls: ["Art.7(3)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-cm-003", text: "Are consent records maintained with timestamp, method, and text shown?", hint: "Controllers must demonstrate that consent was obtained.", opts: ["Yes -- full audit trail with timestamp, IP, and consent text", "Basic records kept but incomplete", "Records kept inconsistently", "No consent records maintained"], controls: ["Art.7(1)"], depth: ["deep"], weight: 1.2 },
    ],
    "Data Subject Rights": [
      { id: "gdpr-dsr-001", text: "Can data subjects exercise their right of access (Art.15) within the 30-day deadline?", hint: "Organizations must provide a copy of personal data within one month.", opts: ["Yes -- automated process, completed within 30 days with tracking", "Manual process but consistently completed on time", "Often delayed or inconsistent", "No process in place"], controls: ["Art.15"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-dsr-002", text: "Is the right to erasure (right to be forgotten, Art.17) implemented?", hint: "Data subjects can request deletion when data is no longer needed or consent is withdrawn.", opts: ["Yes -- automated deletion with cascade to all systems and processors", "Manual process with checklist, mostly effective", "Partial -- some systems support deletion, others do not", "Not implemented"], controls: ["Art.17"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-dsr-003", text: "Is data portability supported (Art.20) with structured, machine-readable format?", hint: "Data subjects have the right to receive their data in a commonly used format.", opts: ["Yes -- CSV/JSON export with full data available within 30 days", "Export available but not in standard format", "Informal data provision upon request", "Not supported"], controls: ["Art.20"], depth: ["intermediate", "deep"], weight: 1.2 },
      { id: "gdpr-dsr-004", text: "Can individuals rectify inaccurate data (Art.16) and is this notified to recipients?", hint: "Rectification requests must be fulfilled and third-party recipients notified.", opts: ["Yes -- automated correction with recipient notification", "Manual correction, recipients not always notified", "Inconsistent handling of rectification requests", "Not implemented"], controls: ["Art.16", "Art.19"], depth: ["deep"], weight: 1.1 },
    ],
    "Privacy Notice & Transparency": [
      { id: "gdpr-pn-001", text: "Are privacy notices provided at the point of data collection (Art.13/14)?", hint: "Privacy notices must be concise, transparent, intelligible, and easily accessible.", opts: ["Yes -- clear, layered notices at every collection point", "Privacy notice exists but not always presented at collection", "Outdated or hard to find", "No privacy notice provided"], controls: ["Art.13", "Art.14"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Data Protection Officer": [
      { id: "gdpr-dpo-001", text: "Is a Data Protection Officer (DPO) appointed where required (Art.37)?", hint: "Public authorities, large-scale systematic monitoring, or large-scale special category data processing require a DPO.", opts: ["Yes -- DPO appointed with independence, expertise, and resources", "DPO appointed but lacks independence or resources", "DPO role assigned informally or shared", "No DPO appointed despite requirement"], controls: ["Art.37", "Art.38"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
    ],
    "Data Protection Impact Assessment": [
      { id: "gdpr-dpia-001", text: "Are DPIAs conducted for high-risk processing (Art.35)?", hint: "DPIAs are mandatory when processing is likely to result in a high risk to individuals.", opts: ["Yes -- formal DPIA process with documented outcomes and mitigation", "DPIAs done ad-hoc for some projects", "Aware of requirement but not consistently applied", "No DPIA process"], controls: ["Art.35"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Breach Notification": [
      { id: "gdpr-bn-001", text: "Can personal data breaches be reported to the supervisory authority within 72 hours (Art.33)?", hint: "Controllers must notify the relevant supervisory authority within 72 hours of becoming aware.", opts: ["Yes -- formal process with detection, escalation, and reporting within 72h", "Process exists but untested and slow", "Aware of requirement but no formal process", "No breach notification process"], controls: ["Art.33"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-bn-002", text: "Are affected data subjects notified of high-risk breaches without undue delay (Art.34)?", hint: "Individuals must be informed when a breach is likely to result in a high risk to their rights and freedoms.", opts: ["Yes -- tested communication templates and notification procedures", "Process exists but templates not pre-approved", "Informal notification on case-by-case basis", "No process for notifying affected individuals"], controls: ["Art.34"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Records of Processing": [
      { id: "gdpr-rop-001", text: "Is a Record of Processing Activities (ROPA) maintained (Art.30)?", hint: "Controllers and processors must maintain written records of all processing activities.", opts: ["Yes -- comprehensive RPA with regular review and updates", "ROPA maintained but incomplete or outdated", "Informal documentation of some processing activities", "No ROPA maintained"], controls: ["Art.30"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Data Transfers": [
      { id: "gdpr-dt-001", text: "Are international data transfers governed by appropriate safeguards (Art.44-49)?", hint: "Transfers outside the EEA require adequacy decisions, SCCs, BCRs, or derogations.", opts: ["Yes -- SCCs/BCRs/adequacy decisions documented for all transfers", "Most transfers covered but some lack formal safeguards", "Informal arrangements for some international transfers", "No safeguards in place"], controls: ["Art.44", "Art.46"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // DPDPA — India Digital Personal Data Protection Act
  // ─────────────────────────────────────────────────────────────────
  "DPDP Act": {
    "Data Minimization & Purpose": [
      { id: "dpdp-dm-001", text: "Is personal data collected only for lawful, specific purposes (S.4)?", hint: "DPDP Act requires data minimisation -- collect no more data than strictly required for the purpose.", opts: ["Yes -- strict purpose limitation enforced with regular audits", "Mostly limited but some excess data collected", "Broad collection without clear purpose mapping", "No limitation on data collection"], controls: ["S.4"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-dm-002", text: "Is data retained only for as long as necessary for the stated purpose?", hint: "Data fiduciaries must erase personal data once the purpose is fulfilled or consent is withdrawn.", opts: ["Yes -- automated retention and deletion policies enforced", "Manual review of retention periodically", "Retention policy exists but not consistently enforced", "Data retained indefinitely"], controls: ["S.4", "S.8"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-dm-003", text: "Are there procedures to ensure personal data is accurate and complete (S.8(3))?", hint: "Data fiduciaries must ensure accuracy and completeness where data is used to make decisions.", opts: ["Yes -- data validation at entry and periodic accuracy audits", "Manual data cleaning performed periodically", "Informal correction of errors", "No accuracy controls"], controls: ["S.8(3)"], depth: ["deep"], weight: 1.2 },
    ],
    "Consent & Notice": [
      { id: "dpdp-con-001", text: "Is free, specific, informed, and unambiguous consent obtained before processing (S.6)?", hint: "DPDP requires explicit consent with clear purpose. Consent must be as easy to withdraw as to give.", opts: ["Yes -- granular consent with withdrawal option, recorded with timestamp", "Consent obtained but not always granular or recorded", "Implied consent used in some cases", "No formal consent mechanism"], controls: ["S.6"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-con-002", text: "Is a notice provided in English or any 8th Schedule language as requested (S.5)?", hint: "Notice must accompany or precede consent request, describing data and purpose.", opts: ["Yes -- multi-language notices available and provided at collection", "Notice provided in English only", "Notice exists but lacks required details", "No formal notice provided"], controls: ["S.5"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-con-003", text: "Is consent for children's data obtained from parent/guardian (S.9)?", hint: "Processing children's data requires verifiable parental consent.", opts: ["Yes -- age-gating and parental consent verification in place", "Age-gating in place but parental consent not always verified", "Aware of requirement but no formal process", "No controls for children's data"], controls: ["S.9"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Significant Data Fiduciary (SDF) Obligations": [
      { id: "dpdp-sdf-001", text: "Has the organization determined if it qualifies as a Significant Data Fiduciary (S.10)?", hint: "SDF status is based on volume, sensitivity, risk to state/public order, etc.", opts: ["Yes -- formal assessment of SDF criteria conducted", "Understood likely status but no formal assessment", "Aware of criteria but not assessed", "No awareness of SDF status"], controls: ["S.10"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-sdf-002", text: "Is an independent Data Auditor appointed for periodic audits (S.10(2)(b))?", hint: "SDFs must appoint an independent data auditor to evaluate compliance.", opts: ["Yes -- independent auditor appointed with annual audit schedule", "Audit planned but auditor not yet appointed", "Aware of requirement, no action taken", "Not implemented"], controls: ["S.10(2)(b)"], depth: ["deep"], weight: 1.4 },
      { id: "dpdp-sdf-003", text: "Is a Data Protection Impact Assessment (DPIA) conducted for SDFs (S.10(2)(c))?", hint: "SDFs must conduct periodic DPIAs to identify and manage risks.", opts: ["Yes -- formal DPIA process with documented outcomes and remediation", "DPIAs conducted ad-hoc", "Aware of requirement, no formal process", "No DPIA conducted"], controls: ["S.10(2)(c)"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Data Principal Rights": [
      { id: "dpdp-dpr-001", text: "Can data principals exercise their right to access, correct, and erase data (S.11-13)?", hint: "Data principals have rights to access, correction, erasure, and grievance redressal.", opts: ["Yes -- self-service portal with automated fulfillment within statutory timelines", "Manual process, completed within statutory timelines", "Possible but slow and inconsistent", "Not supported"], controls: ["S.11", "S.12", "S.13"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-dpr-002", text: "Can data principals nominate a representative for exercising rights (S.14)?", hint: "DPDP allows data principals to nominate someone to exercise their rights in case of death/incapacity.", opts: ["Yes -- nomination process documented and operational", "Aware of right but process not established", "Informal arrangements only", "Not supported"], controls: ["S.14"], depth: ["deep"], weight: 1.1 },
    ],
    "Data Protection Officer (DPO)": [
      { id: "dpdp-dpo-001", text: "Is a Data Protection Officer appointed for SDFs (S.10(2)(a))?", hint: "SDFs must appoint a DPO based in India, reporting to the Board.", opts: ["Yes -- India-based DPO appointed, reporting to the Board", "DPO appointed but not India-based or not reporting to Board", "Shared role with no clear authority", "No DPO appointed"], controls: ["S.10(2)(a)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-dpo-002", text: "Are DPO/Grievance Officer contact details published for data principals (S.10)?", hint: "Data fiduciaries must publish contact details of a person to address grievances.", opts: ["Yes -- published on website and in all privacy notices", "Published on website only", "Informally shared upon request", "Not published"], controls: ["S.10"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
    ],
    "Security & Breach Notification": [
      { id: "dpdp-bn-001", text: "Are security safeguards implemented to prevent personal data breach (S.8(5))?", hint: "Data fiduciaries must implement appropriate technical and organizational measures.", opts: ["Yes -- encryption, MFA, SOC monitoring, and regular vulnerability tests", "Basic safeguards in place (firewall, AV)", "Minimal controls with significant gaps", "No security safeguards"], controls: ["S.8(5)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-bn-002", text: "Is there a process to notify the Board and affected data principals of breaches (S.8(6))?", hint: "Mandatory notification required for all personal data breaches.", opts: ["Yes -- formal detection, escalation, and notification within statutory timelines", "Process exists but untested", "Informal notification plan", "No breach notification process"], controls: ["S.8(6)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Cross-Border Transfer & Processing": [
      { id: "dpdp-xb-001", text: "Are cross-border data transfers restricted as per government notifications (S.16)?", hint: "DPDP allows government to notify restricted countries/territories.", opts: ["Yes -- transfer impact assessments and country restrictions monitored", "Basic due diligence on transfer destinations", "Transfers made without checking restrictions", "No controls on cross-border transfers"], controls: ["S.16"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-xb-002", text: "Are Data Processors engaged via valid contracts with security obligations (S.8(1))?", hint: "Data fiduciaries must have a valid contract when engaging data processors.", opts: ["Yes -- all processors have DPA with security, audit, and breach notification clauses", "Most processors have basic contracts", "Many processors engaged without formal DPA", "No contractual controls"], controls: ["S.8(1)"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CCPA — California Consumer Privacy Act
  // ─────────────────────────────────────────────────────────────────
  "CCPA": {
    "Consumer Rights": [
      { id: "ccpa-cr-001", text: "Can consumers exercise their right to know what personal information is collected (S.1798.100)?", hint: "Consumers have the right to request disclosure of categories and specific pieces of PI collected.", opts: ["Yes -- automated disclosure process within 45-day deadline", "Manual process, completed within timeline", "Partial disclosure capability", "No process in place"], controls: ["S.1798.100"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "ccpa-cr-002", text: "Is the right to deletion implemented (S.1798.105)?", hint: "Consumers can request deletion of their personal information with certain exceptions.", opts: ["Yes -- automated deletion with cascade to service providers", "Manual deletion process with checklist", "Partial -- some systems support deletion", "Not implemented"], controls: ["S.1798.105"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "ccpa-cr-003", text: "Is the right to opt-out of sale of personal information supported (S.1798.120)?", hint: "Consumers have the right to direct businesses not to sell their PI.", opts: ["Yes -- clear 'Do Not Sell My PI' link with automated opt-out", "Opt-out available but not prominently displayed", "Informal opt-out upon request", "No opt-out mechanism"], controls: ["S.1798.120"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "ccpa-cr-004", text: "Is non-discrimination enforced for consumers exercising their rights (S.1798.125)?", hint: "Businesses cannot discriminate against consumers who exercise CCPA rights.", opts: ["Yes -- policy enforced with regular compliance audits", "Policy in place but not systematically audited", "Aware of requirement but no formal controls", "No non-discrimination safeguards"], controls: ["S.1798.125"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Notice at Collection": [
      { id: "ccpa-nc-001", text: "Is a notice at collection provided disclosing categories of PI collected (S.1798.100(b))?", hint: "Businesses must inform consumers at or before the point of collection.", opts: ["Yes -- clear notice at every collection point", "Notice available on website but not always at collection", "Outdated or incomplete notice", "No notice provided"], controls: ["S.1798.100(b)"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Verification": [
      { id: "ccpa-vf-001", text: "Is a verifiable consumer request process in place (S.1798.130)?", hint: "Businesses must verify the identity of the person making a request.", opts: ["Yes -- multi-factor verification with documented procedures", "Basic verification (email/account match)", "Minimal or inconsistent verification", "No verification process"], controls: ["S.1798.130"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Service Provider Management": [
      { id: "ccpa-sp-001", text: "Do contracts with service providers include CCPA-required restrictions (S.1798.140)?", hint: "Service provider contracts must prohibit selling, sharing, or using PI beyond contract purpose.", opts: ["Yes -- all contracts updated with CCPA clauses and monitored", "Most contracts updated but some legacy agreements remain", "Partial contractual provisions", "No contractual controls"], controls: ["S.1798.140"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // HIPAA — Health Insurance Portability and Accountability Act
  // ─────────────────────────────────────────────────────────────────
  "HIPAA": {
    "Administrative Safeguards": [
      { id: "hipaa-as-001", text: "Is a Security Officer formally designated with documented responsibilities (164.308(a)(2))?", hint: "HIPAA requires a named Security Official accountable for PHI protection.", opts: ["Yes -- designated with documented role, authority, and resources", "Yes, but role is informal or shared", "Shared responsibility with no single owner", "No designated Security Officer"], controls: ["164.308(a)(2)"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "hipaa-as-002", text: "Is workforce security awareness training on PHI handling conducted regularly (164.308(a)(5))?", hint: "Training must be provided to all workforce members who access PHI.", opts: ["Annual training with records, attestation, and phishing simulations", "Onboarding training only", "Ad-hoc training with no records", "No security training"], controls: ["164.308(a)(5)"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
      { id: "hipaa-as-003", text: "Is a risk analysis conducted and documented per 164.308(a)(1)(ii)(A)?", hint: "Regular, thorough risk analysis of ePHI systems is required.", opts: ["Yes -- annual comprehensive risk analysis with documented remediation", "Risk analysis conducted but informal or outdated", "Partial or incomplete analysis", "No risk analysis conducted"], controls: ["164.308(a)(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "hipaa-as-004", text: "Is contingency planning documented with data backup, disaster recovery, and emergency mode operation (164.308(a)(7))?", hint: "HIPAA requires established policies for responding to emergencies.", opts: ["Yes -- tested plans covering backup, DR, and emergency mode with documented RTO/RPO", "Plans documented but untested", "Partial plans covering some scenarios", "No contingency plans"], controls: ["164.308(a)(7)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Technical Safeguards": [
      { id: "hipaa-ts-001", text: "Is ePHI encrypted at rest and in transit using current standards (164.312(a)(1))?", hint: "Encryption is an addressable safeguard -- AES-256 at rest, TLS 1.2+ in transit.", opts: ["AES-256 at rest and TLS 1.2+ in transit enforced across all systems", "Partially encrypted -- some systems lag", "In-transit encryption only", "No encryption implemented"], controls: ["164.312(a)(1)", "164.312(e)(2)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "hipaa-ts-002", text: "Are audit controls implemented to record and examine access to ePHI (164.312(b))?", hint: "Hardware, software, and procedural mechanisms must record and examine access.", opts: ["Comprehensive audit logging with regular review and alerting", "Logs collected but rarely reviewed", "Partial logging on some systems", "No audit logging"], controls: ["164.312(b)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "hipaa-ts-003", text: "Is unique user identification enforced for accessing ePHI systems (164.312(d))?", hint: "Each user must have a unique identifier for tracking access.", opts: ["Yes -- unique IDs enforced with automated provisioning/deprovisioning", "Unique IDs used but shared accounts exist", "Some shared accounts in use", "No unique identification"], controls: ["164.312(d)"], depth: ["intermediate", "deep"], weight: 1.2 },
      { id: "hipaa-ts-004", text: "Is automatic logoff implemented for ePHI access sessions (164.312(c))?", hint: "Electronic procedures must terminate a session after a predetermined time of inactivity.", opts: ["Yes -- automatic logoff with appropriate timeout configured", "Timeouts configured but inconsistent across systems", "Some systems without automatic logoff", "No automatic logoff"], controls: ["164.312(c)"], depth: ["deep"], weight: 1.1 },
    ],
    "Physical Safeguards": [
      { id: "hipaa-ps-001", text: "Are facility access controls in place to limit physical access to ePHI systems (164.310(a)(1))?", hint: "Physical access to data centers, server rooms, and workstations must be controlled.", opts: ["Yes -- badge access, visitor logs, and monitoring in all sensitive areas", "Basic access controls in place", "Some areas lack access controls", "No physical access controls"], controls: ["164.310(a)(1)"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Privacy Rule": [
      { id: "hipaa-pr-001", text: "Is a current Notice of Privacy Practices provided to patients (164.520)?", hint: "Required for covered entities under the HIPAA Privacy Rule.", opts: ["Yes -- current NPP provided at every intake and posted prominently", "NPP available but outdated or hard to find", "Informally communicated to patients", "Not provided"], controls: ["164.520"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
    ],
    "Breach Notification": [
      { id: "hipaa-bn-001", text: "Is a breach assessment and notification process compliant with the Breach Notification Rule (164.410)?", hint: "60-day notification required to HHS and affected individuals for breaches of 500+.", opts: ["Formal process with legal review, tested via tabletop", "Process exists informally", "Under development", "No breach notification process"], controls: ["164.410", "164.404"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27001 — Information Security Management
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27001": {
    "Governance": [
      { id: "iso-gov-001", text: "Does your organization have a formally documented Information Security Policy?", hint: "Policy must be management-approved, communicated to all staff, and reviewed periodically.", opts: ["Yes -- fully documented, communicated, and reviewed annually", "Partially documented or not communicated to all", "In draft stage", "No formal policy exists"], controls: ["A.5.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-gov-002", text: "Is there a dedicated CISO or Information Security Management function?", hint: "Consider defined roles, responsibilities, and accountability structures.", opts: ["Yes -- dedicated team with CISO reporting to management", "CISO only, no dedicated team", "Shared responsibility informally assigned", "No dedicated role"], controls: ["A.6.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "iso-gov-003", text: "How frequently is the Information Security Policy reviewed and updated?", hint: "ISO 27001 recommends annual reviews or reviews following significant changes.", opts: ["Annually or more frequently with documented review process", "Every 2 years", "Rarely -- 3+ years since last review", "Never formally reviewed"], controls: ["A.5.1"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Risk Management": [
      { id: "iso-risk-001", text: "Does your organization conduct formal Information Security Risk Assessments?", hint: "Should systematically identify, analyze, and evaluate risks with documented methodology.", opts: ["Yes -- formal annual process with documented methodology and treatment", "Ad-hoc assessments as needed", "Only for new projects or major changes", "No formal risk assessment process"], controls: ["A.8.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-risk-002", text: "Is there a documented Risk Treatment Plan addressing identified risks?", hint: "Plan should map each risk to controls with named owners and remediation timelines.", opts: ["Yes -- comprehensive plan with owners, timelines, and progress tracking", "Partial treatment plans for major risks only", "Informal notes, no formal plan", "No risk treatment plan"], controls: ["A.8.3"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-risk-003", text: "Are residual risks formally accepted by management after treatment?", hint: "Risk acceptance should be documented and signed off at appropriate authority level.", opts: ["Yes -- formal acceptance process with documented sign-off", "Informal acceptance by team leads", "Sometimes, inconsistently documented", "No acceptance process"], controls: ["A.8.3"], depth: ["deep"], weight: 1.2 },
    ],
    "Access Control": [
      { id: "iso-acc-001", text: "Is there a formal Access Control Policy governing user access rights?", hint: "Covers provisioning, periodic review, and revocation procedures.", opts: ["Yes -- comprehensive policy enforced across all systems", "Basic policy, inconsistently enforced", "Under development", "No access control policy"], controls: ["A.9.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-acc-002", text: "Are privileged access accounts subject to enhanced controls?", hint: "Consider MFA, just-in-time access, session recording, and quarterly reviews.", opts: ["Yes -- MFA, JIT access, session monitoring, and quarterly reviews", "MFA enforced only", "Basic separation of privileged accounts, no extra controls", "No additional controls for privileged accounts"], controls: ["A.9.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-acc-003", text: "How often are user access rights formally reviewed?", hint: "Regular access reviews prevent privilege creep and unauthorized access accumulation.", opts: ["Quarterly or more frequently with documented outcomes", "Annually", "Only when users leave the organization", "Never formally reviewed"], controls: ["A.9.2"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Operations Security": [
      { id: "iso-ops-001", text: "Are documented operational procedures in place for all critical activities?", hint: "Covers change management, capacity planning, malware protection, and backup procedures.", opts: ["Fully documented and regularly reviewed with version control", "Key procedures documented, others informal", "Mostly informal procedures", "No formal documentation"], controls: ["A.12.1"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
      { id: "iso-ops-002", text: "Is vulnerability management conducted on a regular schedule?", hint: "Covers patch management, vulnerability scanning, and remediation SLAs.", opts: ["Monthly scanning with defined remediation SLAs and management reporting", "Quarterly scanning with informal remediation", "Ad-hoc -- only after incidents", "No formal vulnerability management"], controls: ["A.12.6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-ops-003", text: "Are backups performed, protected, and regularly tested for restoration?", hint: "Backups must be tested to ensure recovery capability.", opts: ["Yes -- automated, encrypted backups with quarterly restoration tests", "Backups performed but restoration testing is irregular", "Backups exist but not protected or tested", "No formal backup process"], controls: ["A.12.3"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Incident Management": [
      { id: "iso-inc-001", text: "Does the organization have a tested Information Security Incident Response Plan?", hint: "Should cover detection, containment, eradication, recovery, and lessons learned.", opts: ["Yes -- tested via tabletop exercises within 12 months with documented outcomes", "Documented but never tested", "Informal response procedures only", "No incident response plan"], controls: ["A.16.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-inc-002", text: "Are security incidents logged, tracked, and escalated to closure?", hint: "Includes incident register, root cause analysis, and lessons learned process.", opts: ["Yes -- with SIEM or formal ticketing system and management reporting", "Spreadsheet-based tracking", "Informal logging only", "No systematic incident tracking"], controls: ["A.16.1"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Business Continuity": [
      { id: "iso-bcp-001", text: "Does the organization have a tested Business Continuity Plan?", hint: "BCP should cover critical IT systems, key processes, and recovery priorities.", opts: ["Yes -- tested within 12 months with documented results", "Documented but untested", "Under development", "No BCP exists"], controls: ["A.17.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Asset Management": [
      { id: "iso-ast-001", text: "Is there a complete, maintained inventory of all information assets?", hint: "Includes hardware, software, data assets, cloud services, and third-party systems.", opts: ["Yes -- maintained CMDB with automated discovery and ownership", "Manual inventory, partially complete", "Spreadsheet-based, often outdated", "No formal asset inventory"], controls: ["A.8.1"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
    ],
    "Compliance": [
      { id: "iso-cmp-001", text: "Are legal, regulatory, and contractual compliance requirements formally inventoried?", hint: "Includes DPDP Act, GDPR applicability, industry regulations, and contractual obligations.", opts: ["Yes -- maintained register reviewed annually with gap analysis", "Partially identified for major requirements", "Informally known but not documented", "Not systematically tracked"], controls: ["A.18.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Supplier Relationships": [
      { id: "iso-sup-001", text: "Are information security requirements included in supplier agreements?", hint: "Supplier agreements must address security controls and right to audit.", opts: ["Yes -- security clauses and audit rights in all supplier contracts", "Security requirements in most contracts", "Informal security expectations only", "No security requirements in supplier agreements"], controls: ["A.15.1"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27002 — Security Controls Implementation
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27002": {
    "Physical Security": [
      { id: "iso27002-ps-001", text: "Are physical entry controls in place for secure areas (badge, biometric, or guard)?", hint: "Access to secure areas should be controlled and logged.", opts: ["Yes -- multi-factor physical access with visitor logging and escort", "Badge access with visitor log", "Basic door locks only", "No physical access controls"], controls: ["A.7.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "iso27002-ps-002", text: "Are server rooms protected against environmental threats (fire, flood, power)?", hint: "Physical protections against environmental hazards are required.", opts: ["Yes -- fire suppression, UPS, generator, flood protection, and monitoring", "Some protections in place (fire and UPS)", "Basic protections only", "No environmental protections"], controls: ["A.7.4", "A.7.5"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Network Security": [
      { id: "iso27002-ns-001", text: "Are network segments separated to protect sensitive systems?", hint: "Network segmentation limits the impact of a breach.", opts: ["Yes -- micro-segmentation with least-privilege network access", "Basic VLAN separation for critical systems", "Flat network with no segmentation", "No network security controls"], controls: ["A.8.20"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso27002-ns-002", text: "Are firewalls and IDS/IPS deployed and monitored?", hint: "Perimeter and internal network monitoring is essential.", opts: ["Yes -- next-gen firewalls with IDS/IPS and 24/7 monitoring", "Firewalls deployed but IDS/IPS not comprehensive", "Basic firewall only", "No network perimeter controls"], controls: ["A.8.20", "A.8.21"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Malware Protection": [
      { id: "iso27002-mp-001", text: "Is anti-malware software deployed on all endpoints and servers?", hint: "Protection against malicious software must be comprehensive.", opts: ["Yes -- EDR/XDR on all devices with centralized management and alerting", "Traditional AV on most devices", "Anti-malware on some devices only", "No anti-malware protection"], controls: ["A.8.7"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Logging & Monitoring": [
      { id: "iso27002-lm-001", text: "Are security event logs generated, stored, and reviewed?", hint: "Logs must be protected from tampering and reviewed for anomalies.", opts: ["Yes -- centralized SIEM with 90+ day retention and daily review", "Logs collected but review is periodic or ad-hoc", "Logs on some systems only", "No security logging"], controls: ["A.8.15", "A.8.16"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Backup & Recovery": [
      { id: "iso27002-br-001", text: "Are information backups performed regularly and tested for integrity?", hint: "Backup copies must be protected and tested to ensure availability.", opts: ["Yes -- automated daily backups with quarterly restoration tests and off-site storage", "Regular backups but restoration testing is infrequent", "Backups performed but not tested or protected", "No formal backup process"], controls: ["A.8.13"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Secure Development": [
      { id: "iso27002-sd-001", text: "Is secure coding practiced with code review and vulnerability testing?", hint: "Secure development lifecycle reduces vulnerabilities in software.", opts: ["Yes -- SAST/DAST, code review, and security training for all developers", "Code review practiced but no automated security testing", "Minimal security in development process", "No secure development practices"], controls: ["A.8.25", "A.8.26"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27701 — Privacy Information Management
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27701": {
    "Privacy Management": [
      { id: "iso27701-pm-001", text: "Is a Privacy Information Management System (PIMS) established?", hint: "PIMS extends ISMS to include privacy controls per ISO 27701.", opts: ["Yes -- formal PIMS integrated with ISMS, certified or in progress", "Privacy management exists but not formally integrated with ISMS", "Informal privacy practices", "No privacy management system"], controls: ["A.6.1.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Consent & Notice": [
      { id: "iso27701-cn-001", text: "Is consent obtained and managed consistently across all PII processing?", hint: "Consent must be documented, verifiable, and withdrawable.", opts: ["Yes -- centralized consent management with audit trail and withdrawal", "Consent documented but withdrawal process weak", "Inconsistent consent practices", "No consent management"], controls: ["A.7.2.2"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Data Subject Rights": [
      { id: "iso27701-dsr-001", text: "Are data subject request procedures documented and tested?", hint: "Procedures for access, rectification, erasure, and portability must be operational.", opts: ["Yes -- documented, tested procedures with SLA monitoring", "Procedures documented but untested", "Informal handling of requests", "No procedures in place"], controls: ["A.7.3"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Privacy Impact": [
      { id: "iso27701-pi-001", text: "Are privacy impact assessments conducted for new processing activities?", hint: "PIAs should identify and mitigate privacy risks before processing begins.", opts: ["Yes -- mandatory PIA for all new projects with documented outcomes", "PIAs conducted for high-risk projects only", "Aware of PIA but not consistently applied", "No PIA process"], controls: ["A.7.2.4"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Cross-Border Privacy": [
      { id: "iso27701-cb-001", text: "Are cross-border PII transfers governed by documented transfer mechanisms?", hint: "Transfers must comply with applicable legal frameworks (SCCs, BCRs, adequacy).", opts: ["Yes -- all transfers covered by SCCs/BCRs with transfer impact assessments", "Most transfers documented, some lack formal mechanisms", "Transfers made without formal safeguards", "No controls on cross-border PII transfers"], controls: ["A.7.2.10"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // PCI DSS — Payment Card Industry Data Security Standard
  // ─────────────────────────────────────────────────────────────────
  "PCI DSS": {
    "Network Security": [
      { id: "pci-ns-001", text: "Are firewalls installed and maintained at all network boundaries?", hint: "PCI Req.1 requires firewalls to protect cardholder data environments.", opts: ["Yes -- next-gen firewalls with rule reviews every 6 months and documented standards", "Firewalls in place but reviews are irregular", "Basic firewall only with default rules", "No firewall protecting cardholder data"], controls: ["Req.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Cardholder Data Protection": [
      { id: "pci-chd-001", text: "Is primary account number (PAN) encrypted during storage and transmission?", hint: "PCI Req.3 and 4 require encryption of stored and transmitted PAN.", opts: ["Yes -- AES-256 at rest, TLS 1.2+ in transit with key rotation", "Encrypted but key management is weak", "Partial encryption -- storage or transit only", "PAN stored or transmitted in clear text"], controls: ["Req.3", "Req.4"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "pci-chd-002", text: "Is cardholder data minimized and only stored when absolutely necessary?", hint: "PCI requires minimizing storage of cardholder data.", opts: ["Yes -- data minimization enforced, no sensitive auth data stored", "Most PAN data minimized but some unnecessary retention", "Significant cardholder data stored beyond need", "No data minimization"], controls: ["Req.3"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Vulnerability Management": [
      { id: "pci-vm-001", text: "Are systems protected against malware and regularly updated?", hint: "PCI Req.5 and 6 require anti-virus and secure systems.", opts: ["Yes -- anti-malware on all systems with monthly patching and ASV scans", "Anti-virus deployed but patching is irregular", "Anti-malware on some systems only", "No malware protection or patch management"], controls: ["Req.5", "Req.6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Access Control": [
      { id: "pci-ac-001", text: "Is access to cardholder data restricted on a need-to-know basis?", hint: "PCI Req.7 requires restricting access based on business need to know.", opts: ["Yes -- RBAC enforced with quarterly access reviews", "Access restricted but reviews are irregular", "Broad access to cardholder data", "No access restrictions"], controls: ["Req.7"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "pci-ac-002", text: "Are unique IDs assigned to each person with access to cardholder data?", hint: "PCI Req.8 requires individual accountability.", opts: ["Yes -- unique IDs with MFA for all access to cardholder data", "Unique IDs but shared accounts exist", "Some shared accounts in use", "No unique identification"], controls: ["Req.8"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Monitoring & Testing": [
      { id: "pci-mt-001", text: "Are all access to cardholder data environments logged and monitored?", hint: "PCI Req.10 requires tracking and monitoring access.", opts: ["Yes -- centralized log management with SIEM, 1-year retention, daily review", "Logs collected but review is periodic", "Logging on some systems only", "No logging or monitoring"], controls: ["Req.10"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Information Security Policy": [
      { id: "pci-is-001", text: "Is an information security policy established and communicated to all personnel?", hint: "PCI Req.12 requires a formal security policy.", opts: ["Yes -- documented policy reviewed annually and acknowledged by all staff", "Policy exists but not regularly reviewed", "Informal policy understanding", "No security policy"], controls: ["Req.12"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // SOC 2 — Service Organization Control 2
  // ─────────────────────────────────────────────────────────────────
  "SOC 2": {
    "Security": [
      { id: "soc2-sec-001", text: "Are logical access controls enforced across all systems?", hint: "SOC 2 Security criterion requires controls over system access.", opts: ["Yes -- RBAC, MFA, quarterly reviews, automated provisioning", "Access controls enforced but MFA not universal", "Basic access controls with manual processes", "No formal access controls"], controls: ["CC6.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "soc2-sec-002", text: "Is the network perimeter protected with firewalls and intrusion detection?", hint: "Perimeter security is fundamental to the security criterion.", opts: ["Yes -- next-gen firewalls, IDS/IPS, with regular rule reviews", "Firewalls with basic IDS", "Basic perimeter protection only", "No perimeter controls"], controls: ["CC6.6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Availability": [
      { id: "soc2-av-001", text: "Are availability commitments (SLAs) monitored and met?", hint: "SOC 2 Availability criterion requires monitoring and meeting availability commitments.", opts: ["Yes -- 99.9%+ uptime with automated failover and incident response", "Monitored but SLAs occasionally missed", "No formal availability monitoring", "No availability commitments"], controls: ["A1.2"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Processing Integrity": [
      { id: "soc2-pi-001", text: "Are data processing controls in place to ensure completeness and accuracy?", hint: "Processing Integrity requires processing is complete, valid, accurate, timely, and authorized.", opts: ["Yes -- automated validation, reconciliation, and error handling", "Manual controls with periodic reconciliation", "Partial controls with known gaps", "No processing integrity controls"], controls: ["PI1.1"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Confidentiality": [
      { id: "soc2-conf-001", text: "Are confidentiality classifications and handling procedures enforced?", hint: "Confidential information must be classified and protected.", opts: ["Yes -- data classification policy with automated enforcement and DLP", "Classification exists with manual enforcement", "Informal classification only", "No confidentiality controls"], controls: ["C1.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Privacy": [
      { id: "soc2-pv-001", text: "Is personal information collected, used, and disposed of per privacy commitments?", hint: "SOC 2 Privacy criterion requires alignment with privacy commitments.", opts: ["Yes -- privacy-by-design with documented procedures across the data lifecycle", "Privacy procedures documented but not consistently followed", "Informal privacy practices", "No privacy controls"], controls: ["P1.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // FedRAMP — Federal Risk and Authorization Management Program
  // ─────────────────────────────────────────────────────────────────
  "FedRAMP": {
    "Security Management": [
      { id: "fedramp-sm-001", text: "Is a Plan of Action and Milestones (POA&M) maintained for known vulnerabilities?", hint: "FedRAMP requires documented remediation tracking for all findings.", opts: ["Yes -- POA&M with prioritized remediation, regular updates, and management review", "POA&M maintained but not regularly updated", "Informal tracking of vulnerabilities", "No POA&M"], controls: ["RA-5"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Access Control": [
      { id: "fedramp-ac-001", text: "Is multi-factor authentication required for all privileged and remote access?", hint: "FedRAMP mandates MFA for all access to cloud environments.", opts: ["Yes -- MFA enforced for all users with FIPS 140-2 validated modules", "MFA for privileged access only", "MFA planned but not deployed", "No MFA"], controls: ["AC-2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Audit & Accountability": [
      { id: "fedramp-aa-001", text: "Are audit logs generated, protected, and retained for at least 90 days online and 1 year archived?", hint: "FedRAMP requires comprehensive audit capability.", opts: ["Yes -- centralized logging with tamper-proof storage meeting retention requirements", "Logs retained but protection is weak", "Logging on some systems only", "No audit logging"], controls: ["AU-2", "AU-11"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Incident Response": [
      { id: "fedramp-ir-001", text: "Is an incident response capability established, tested, and integrated with US-CERT?", hint: "FedRAMP requires coordination with US-CERT and internal IR capability.", opts: ["Yes -- tested IR plan with US-CERT integration and 1-hour detection reporting", "IR plan exists but US-CERT integration is weak", "Informal IR capability", "No IR capability"], controls: ["IR-4", "IR-6"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Configuration Management": [
      { id: "fedramp-cm-001", text: "Are system configurations baselined and change-controlled?", hint: "FedRAMP requires documented configuration baselines with formal change control.", opts: ["Yes -- IaC with automated compliance scanning and formal change approval", "Baseline configurations documented with manual change control", "Informal configuration management", "No configuration management"], controls: ["CM-2", "CM-3"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // NIST CSF — Cybersecurity Framework
  // ─────────────────────────────────────────────────────────────────
  "NIST CSF": {
    "Identify": [
      { id: "nist-id-001", text: "Is a comprehensive asset management program in place covering all organizational assets?", hint: "Covers hardware, software, data, facilities, and personnel.", opts: ["Comprehensive program with automated discovery, classification, and ownership", "Partial coverage of critical assets only", "Minimal tracking via spreadsheets", "No formal program"], controls: ["ID.AM"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "nist-id-002", text: "Are cybersecurity risks formally documented and managed through a risk register?", hint: "Includes likelihood assessments, impact ratings, and treatment tracking.", opts: ["Formal register with regular governance review and treatment plans", "Informal register maintained by security team", "Some risks identified but not managed", "No formal process"], controls: ["ID.RM"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Protect": [
      { id: "nist-pr-001", text: "Are access controls implemented based on least privilege and need-to-know?", hint: "Includes identity management, authentication, and authorization enforcement.", opts: ["Enforced across all systems with RBAC and periodic reviews", "Implemented for critical systems only", "Partially implemented with known gaps", "No formal access controls"], controls: ["PR.AC"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "nist-pr-002", text: "Is security awareness and training delivered to all staff regularly?", hint: "Covers phishing awareness, password hygiene, social engineering, and reporting.", opts: ["Annual training with phishing simulations, role-based content, and testing", "Annual training only", "Onboarding training only", "No security training"], controls: ["PR.AT"], depth: ["quick", "intermediate", "deep"], weight: 1.2 },
      { id: "nist-pr-003", text: "Are data protection mechanisms (encryption, DLP) implemented?", hint: "Data must be protected at rest and in transit.", opts: ["Encryption at rest and in transit with DLP and key management", "Encryption in transit only", "Partial encryption", "No data protection mechanisms"], controls: ["PR.DS"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Detect": [
      { id: "nist-de-001", text: "Are cybersecurity events and anomalies detected and alerted in a timely manner?", hint: "Covers SIEM, IDS/IPS, log aggregation, alerting, and monitoring coverage.", opts: ["24/7 monitoring with automated alerting, escalation, and SOAR", "Business hours monitoring with alerting", "Periodic manual log review", "No monitoring capability"], controls: ["DE.CM"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "nist-de-002", text: "Are detection processes tested and tuned regularly?", hint: "Detection effectiveness must be validated.", opts: ["Yes -- quarterly purple team exercises with detection tuning", "Annual review of detection rules", "Reactive tuning only after incidents", "No testing of detection processes"], controls: ["DE.CM"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Respond": [
      { id: "nist-rs-001", text: "Is there a tested Incident Response Plan with defined roles and communication paths?", hint: "Should include detection, containment, escalation, and communication procedures.", opts: ["Tested within 12 months via tabletop with documented lessons learned", "Documented but untested", "Informal response procedures", "No IRP"], controls: ["RS.RP"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Recover": [
      { id: "nist-rc-001", text: "Are recovery procedures documented and validated for critical systems?", hint: "Includes backup testing, failover drills, and RTO/RPO validation.", opts: ["Tested quarterly with documented results meeting RTO/RPO", "Tested annually", "Documented but never tested", "Not documented"], controls: ["RC.RP"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CIS Controls — Center for Internet Security
  // ─────────────────────────────────────────────────────────────────
  "CIS Controls": {
    "Inventory & Control": [
      { id: "cis-inv-001", text: "Is an active inventory of all enterprise assets maintained?", hint: "CIS Control 1: Discover and manage all devices on the network.", opts: ["Automated discovery with real-time inventory, classification, and ownership", "Quarterly manual inventory with reconciliation", "Partial inventory of known assets", "No asset inventory"], controls: ["CIS 1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "cis-inv-002", text: "Is an active inventory of authorized and unauthorized software maintained?", hint: "CIS Control 2: Maintain a software inventory and only allow approved software.", opts: ["Automated inventory with application allow-listing", "Inventory maintained with manual approval", "Partial inventory", "No software inventory"], controls: ["CIS 2"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Data Protection": [
      { id: "cis-dp-001", text: "Is data classification implemented with appropriate protection controls?", hint: "CIS Control 3: Establish and maintain a data management process.", opts: ["Automated classification with DLP and encryption based on classification", "Manual classification with some automated controls", "Classification policy exists but not enforced", "No data classification"], controls: ["CIS 3"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Email & Web Protection": [
      { id: "cis-ew-001", text: "Are email and web browser protections in place (SPF, DKIM, DMARC, filtering)?", hint: "CIS Control 9: Defend against email and web-based attacks.", opts: ["SPF, DKIM, DMARC enforced + web filtering with sandboxing", "Basic email filtering and web filtering", "Minimal protection", "No email or web protection"], controls: ["CIS 9"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Malware Defense": [
      { id: "cis-md-001", text: "Is anti-malware software deployed with centralized management on all devices?", hint: "CIS Control 10: Deploy and manage anti-malware software.", opts: ["EDR/XDR on all endpoints with centralized management and response", "Traditional AV with centralized management", "Anti-malware on most devices", "No anti-malware"], controls: ["CIS 10"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Network Monitoring": [
      { id: "cis-nm-001", text: "Is network monitoring and defense deployed at all boundaries?", hint: "CIS Control 13: Monitor and improve network infrastructure security.", opts: ["IDS/IPS, NetFlow analysis, and threat intelligence at all boundaries", "Basic IDS at perimeter", "Minimal monitoring", "No network monitoring"], controls: ["CIS 13"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Penetration Testing": [
      { id: "cis-pt-001", text: "Is penetration testing conducted at least annually?", hint: "CIS Control 18: Conduct penetration testing to identify exploitable vulnerabilities.", opts: ["Annual external and internal pen testing by qualified third party with remediation tracking", "Annual pen testing but remediation is slow", "Pen testing done irregularly", "No penetration testing"], controls: ["CIS 18"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // COBIT — Control Objectives for Information and Related Technologies
  // ─────────────────────────────────────────────────────────────────
  "COBIT": {
    "Governance Framework": [
      { id: "cobit-gov-001", text: "Is a governance framework for IT established with clear accountability?", hint: "COBIT requires governance structures for IT decision-making.", opts: ["Yes -- formal IT governance board with documented decision rights and escalation", "Governance exists but informal", "Partial governance for some IT areas", "No governance framework"], controls: ["EDM01"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Strategic Planning": [
      { id: "cobit-sp-001", text: "Is IT strategy aligned with enterprise objectives and regularly reviewed?", hint: "IT must support business goals with measurable outcomes.", opts: ["Yes -- IT strategy mapped to business goals with KPIs and quarterly review", "Strategy exists but alignment is weak", "IT strategy not formally linked to business goals", "No IT strategy"], controls: ["APO02"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "IT Operations": [
      { id: "cobit-ops-001", text: "Are IT service management processes (incident, change, problem) established?", hint: "COBIT requires structured IT operations management.", opts: ["Yes -- ITIL-aligned processes with SLA monitoring and continuous improvement", "Basic processes documented but not fully operational", "Informal operations management", "No ITSM processes"], controls: ["BAI06", "DSS02"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Monitoring": [
      { id: "cobit-mon-001", text: "Is IT performance and compliance monitoring in place with management reporting?", hint: "COBIT requires monitoring of IT performance against targets.", opts: ["Yes -- automated dashboards with management reporting and escalation", "Periodic reporting to management", "Informal monitoring", "No monitoring"], controls: ["MEA01"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27017 — Cloud Security
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27017": {
    "Cloud Roles & Responsibilities": [
      { id: "iso27017-cr-001", text: "Are cloud service roles and responsibilities clearly defined and agreed?", hint: "ISO 27017 requires clear delineation of security responsibilities between provider and customer.", opts: ["Yes -- documented RACI matrix for all cloud security controls", "Roles defined but not comprehensively documented", "Informal understanding of responsibilities", "No role definition"], controls: ["A.12.1.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Virtual Machine Protection": [
      { id: "iso27017-vm-001", text: "Are virtual machines protected with hardened configurations and monitoring?", hint: "Cloud VMs must be hardened, monitored, and isolated.", opts: ["Yes -- hardened images, CIS benchmarks, and runtime monitoring for all VMs", "Basic hardening applied", "Default configurations used", "No VM security controls"], controls: ["A.12.1.2"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Network Isolation": [
      { id: "iso27017-ni-001", text: "Is network isolation between cloud tenants/customers enforced?", hint: "Cloud environments must isolate network traffic between tenants.", opts: ["Yes -- micro-segmentation with encryption between all tenant environments", "Basic network separation", "Shared network with minimal isolation", "No network isolation"], controls: ["A.13.1.3"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27018 — Privacy in Cloud
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27018": {
    "PII Protection": [
      { id: "iso27018-pp-001", text: "Is PII in the cloud protected with encryption and access controls?", hint: "ISO 27018 requires specific protections for personally identifiable information.", opts: ["Yes -- encryption at rest and in transit with role-based access and audit logging", "Basic encryption and access control", "Some PII protection measures in place", "No specific PII protections"], controls: ["A.9.1.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Consent & Purpose": [
      { id: "iso27018-cp-001", text: "Is PII processed only with customer consent and for agreed purposes?", hint: "Cloud providers must not process PII beyond customer instructions.", opts: ["Yes -- documented consent management with purpose limitation enforced", "Consent documented but purpose monitoring is weak", "Informal consent practices", "No consent management"], controls: ["A.9.2.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Transparency": [
      { id: "iso27018-tr-001", text: "Are cloud customers informed about sub-processors and PII access by provider staff?", hint: "Transparency about who can access PII is required.", opts: ["Yes -- full disclosure of sub-processors and staff access with audit logs", "Sub-processors disclosed but staff access is not transparent", "Limited disclosure", "No transparency about PII access"], controls: ["A.9.3.1"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CSA CCM — Cloud Controls Matrix
  // ─────────────────────────────────────────────────────────────────
  "CSA CCM": {
    "Application Security": [
      { id: "csa-as-001", text: "Is application security integrated into the development lifecycle?", hint: "CSA CCM requires secure application development practices.", opts: ["Yes -- SAST/DAST, secure code review, and security requirements in SDLC", "Some security testing in development", "Minimal security in application development", "No application security controls"], controls: ["AIS-01"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Data Security": [
      { id: "csa-ds-001", text: "Are data classification and encryption policies enforced across cloud environments?", hint: "CSA CCM requires data protection throughout its lifecycle.", opts: ["Yes -- classification-based encryption with key lifecycle management", "Encryption deployed but classification is informal", "Partial encryption", "No data encryption"], controls: ["DSI-01", "DSI-02"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "IAM": [
      { id: "csa-iam-001", text: "Is identity and access management centralized with MFA and lifecycle management?", hint: "CSA CCM requires robust identity controls.", opts: ["Yes -- centralized IdP, MFA, automated provisioning/deprovisioning, and access reviews", "Basic IAM with some automation", "Manual access management", "No centralized IAM"], controls: ["IAM-01"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Supply Chain": [
      { id: "csa-sc-001", text: "Are cloud supplier security assessments conducted and monitored?", hint: "Third-party risk must be managed for cloud services.", opts: ["Yes -- standardized assessments with continuous monitoring and exit criteria", "Assessments conducted at onboarding only", "Informal supplier evaluation", "No supplier security assessment"], controls: ["STA-01"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ISO 31000 — Risk Management
  // ─────────────────────────────────────────────────────────────────
  "ISO 31000": {
    "Risk Framework": [
      { id: "iso31000-rf-001", text: "Is a risk management framework established with clear mandate and governance?", hint: "ISO 31000 requires integration of risk management into organizational governance.", opts: ["Yes -- board-approved framework with risk committee and regular reporting", "Framework exists but governance is informal", "Partial framework for some risk areas", "No formal framework"], controls: ["4.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Risk Assessment": [
      { id: "iso31000-ra-001", text: "Are risk assessments conducted systematically with identification, analysis, and evaluation?", hint: "Risk assessment must follow a structured methodology.", opts: ["Yes -- standardized methodology with likelihood/impact matrix and treatment plans", "Risk assessments conducted but methodology is inconsistent", "Informal risk identification only", "No risk assessment process"], controls: ["5.4", "5.5"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Risk Treatment": [
      { id: "iso31000-rt-001", text: "Are risk treatment options (avoid, reduce, share, retain) evaluated and implemented?", hint: "Treatment must be proportionate to the risk level.", opts: ["Yes -- documented treatment plans with cost-benefit analysis and ownership", "Treatment options considered but not systematically implemented", "Ad-hoc risk treatment", "No risk treatment process"], controls: ["5.6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Monitoring & Review": [
      { id: "iso31000-mr-001", text: "Is risk management performance monitored and reviewed regularly?", hint: "Continuous improvement of the risk management framework is required.", opts: ["Yes -- KRI dashboards, quarterly reviews, and framework maturity assessments", "Periodic review of risk register", "Informal monitoring", "No monitoring or review"], controls: ["5.7"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // NIST RMF — Risk Management Framework
  // ─────────────────────────────────────────────────────────────────
  "NIST RMF": {
    "Categorize": [
      { id: "nist-rmf-cat-001", text: "Are information systems categorized based on impact levels (low, moderate, high)?", hint: "NIST RMF Step 1: Categorize systems and information based on FIPS 199 impact levels.", opts: ["Yes -- formal categorization with documented rationale and POA&M integration", "Categorization done but documentation is incomplete", "Informal categorization", "No system categorization"], controls: ["RMF Step 1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Select": [
      { id: "nist-rmf-sel-001", text: "Are security controls selected and tailored based on system categorization?", hint: "NIST RMF Step 2: Select controls from NIST SP 800-53.", opts: ["Yes -- controls selected and tailored with documented justification", "Standard control sets applied without tailoring", "Partial control selection", "No formal control selection"], controls: ["RMF Step 2"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Implement": [
      { id: "nist-rmf-imp-001", text: "Are selected security controls implemented and documented?", hint: "NIST RMF Step 3: Implement controls and document how they are deployed.", opts: ["Yes -- controls implemented with documentation and configuration management", "Most controls implemented but documentation gaps", "Partial implementation", "Controls not implemented"], controls: ["RMF Step 3"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Assess": [
      { id: "nist-rmf-ass-001", text: "Are security controls assessed for effectiveness by independent assessors?", hint: "NIST RMF Step 4: Assess control effectiveness.", opts: ["Yes -- independent assessment with documented findings and remediation", "Internal assessment only", "Informal assessment", "No assessment"], controls: ["RMF Step 4"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Authorize": [
      { id: "nist-rmf-auth-001", text: "Is system authorization granted by a senior official based on risk determination?", hint: "NIST RMF Step 5: Authorizing official makes risk-based decision.", opts: ["Yes -- formal ATO with risk acceptance, POA&M, and continuous monitoring plan", "ATO granted but without comprehensive risk assessment", "Informal authorization", "No formal authorization"], controls: ["RMF Step 5"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Monitor": [
      { id: "nist-rmf-mon-001", text: "Are security controls continuously monitored for effectiveness?", hint: "NIST RMF Step 6: Monitor controls and system changes.", opts: ["Yes -- automated continuous monitoring with real-time dashboards and escalation", "Periodic monitoring and reporting", "Reactive monitoring only after incidents", "No monitoring"], controls: ["RMF Step 6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
  },
};

module.exports = QUESTION_BANK;
