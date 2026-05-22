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
    "Lawful Basis & Transparency": [
      { id: "gdpr-lb-001", text: "Does the organisation process personal data based on a valid lawful basis (consent, contract, legal obligation, vital interest, public task, legitimate interest)?", hint: "GDPR Art.6 requires a valid lawful basis for all processing of personal data.", opts: ["Yes -- all processing activities have a documented lawful basis", "Majority of activities have a basis, some gaps exist", "Partially identified with informal understanding only", "No lawful basis identified for processing activities"], controls: ["Art.6"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-lb-002", text: "Is the lawful basis documented for each processing activity?", hint: "Art.5(2) requires accountability -- you must be able to demonstrate compliance.", opts: ["Yes -- documented for every activity with clear rationale", "Mostly documented but some activities lack clear basis", "Partially documented", "No documentation of lawful basis"], controls: ["Art.5(2)", "Art.6"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-lb-003", text: "Does the organisation ensure that data is processed in a fair and transparent manner?", hint: "Art.5(1)(a) requires lawfulness, fairness, and transparency.", opts: ["Yes -- data subjects are fully informed and processing is transparent", "Mostly transparent with some areas needing improvement", "Limited transparency controls in place", "No transparency measures implemented"], controls: ["Art.5(1)(a)"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-lb-004", text: "Is privacy information provided to data subjects at the time of data collection?", hint: "Art.13 requires specific information be provided when data is collected from the data subject.", opts: ["Yes -- comprehensive privacy notice at every collection point", "Notice provided but not always at collection point", "Notice exists but is outdated or hard to find", "No privacy notice provided"], controls: ["Art.13", "Art.14"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-lb-005", text: "If data is obtained indirectly, is privacy information provided within a reasonable period?", hint: "Art.14 requires transparency when data is not obtained directly from the data subject.", opts: ["Yes -- provided within one month or at first communication, whichever is earlier", "Provided but sometimes beyond the required period", "Inconsistently provided", "No process for indirect data collection transparency"], controls: ["Art.14"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Purpose Limitation & Data Minimisation": [
      { id: "gdpr-pl-001", text: "Is personal data collected only for specified, explicit, and legitimate purposes?", hint: "Art.5(1)(b) requires purpose limitation.", opts: ["Yes -- purposes are clearly defined and documented before collection", "Purposes defined but broad or vague", "Informal purpose definition", "No purpose limitation in place"], controls: ["Art.5(1)(b)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-pl-002", text: "Is data reused only if compatible with the original purpose?", hint: "Art.5(1)(b) requires compatibility assessment for further processing.", opts: ["Yes -- compatibility assessed for all new processing purposes", "Compatibility checked informally for major changes", "Aware of requirement but not systematically applied", "No compatibility assessment conducted"], controls: ["Art.5(1)(b)", "Art.6(4)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-pl-003", text: "Is data collection limited to what is adequate, relevant, and necessary?", hint: "Art.5(1)(c) requires data minimisation.", opts: ["Yes -- data minimisation enforced with regular audits of collection practices", "Mostly limited but some excess data collected", "Broad collection without clear necessity assessment", "No data minimisation controls"], controls: ["Art.5(1)(c)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Storage Limitation & Data Retention": [
      { id: "gdpr-sl-001", text: "Does the organisation define and enforce data retention periods for each category of personal data?", hint: "Art.5(1)(e) requires data kept no longer than necessary.", opts: ["Yes -- documented retention schedules for all data categories with automated enforcement", "Retention periods defined but enforcement is manual", "Retention periods exist for some data categories only", "No defined retention periods"], controls: ["Art.5(1)(e)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-sl-002", text: "Is personal data deleted or anonymised once the retention period expires?", hint: "Art.5(1)(e) mandates erasure or anonymisation when data is no longer needed.", opts: ["Yes -- automated deletion/anonymisation with verification", "Manual deletion process with periodic reviews", "Deletion performed inconsistently", "No deletion process implemented"], controls: ["Art.5(1)(e)", "Art.17"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-sl-003", text: "Are retention policies documented and regularly reviewed?", hint: "Retention schedules should be reviewed periodically.", opts: ["Yes -- documented policies reviewed annually with business input", "Policy documented but reviews are infrequent", "Informal retention practices", "No retention policy documented"], controls: ["Art.5(1)(e)", "Art.30"], depth: ["deep"], weight: 1.2 },
    ],
    "Data Subject Rights": [
      { id: "gdpr-dsr-001", text: "Can data subjects request access to their personal data?", hint: "Art.15 grants right of access.", opts: ["Yes -- automated access portal with responses within 30 days", "Manual process, consistently completed within deadline", "Possible but slow and inconsistent", "No access mechanism available"], controls: ["Art.15"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-dsr-002", text: "Is there a process to correct inaccurate or incomplete data?", hint: "Art.16 grants right to rectification.", opts: ["Yes -- documented rectification process with timely corrections", "Correction process exists but slow", "Informal correction on request", "No rectification process"], controls: ["Art.16"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-dsr-003", text: "Can data subjects request deletion of personal data under valid conditions?", hint: "Art.17 grants right to erasure.", opts: ["Yes -- automated deletion cascade across all systems and processors", "Manual deletion with checklist", "Partial deletion across some systems", "No deletion capability"], controls: ["Art.17"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-dsr-004", text: "Is restriction of processing supported where applicable?", hint: "Art.18 grants right to restriction.", opts: ["Yes -- formal restriction process with system-level enforcement", "Process documented but manual implementation", "Informal handling of restriction requests", "No restriction mechanism"], controls: ["Art.18"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-dsr-005", text: "Can data be provided in a structured, commonly used, machine-readable format?", hint: "Art.20 grants right to data portability.", opts: ["Yes -- CSV/JSON export with full data available", "Export available but format not fully machine-readable", "Manual data compilation upon request", "No portability supported"], controls: ["Art.20"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-dsr-006", text: "Can users object to processing, including profiling and marketing?", hint: "Art.21 grants right to object.", opts: ["Yes -- clear objection process honored promptly", "Objection process exists but delayed", "Informal handling of objections", "No objection mechanism"], controls: ["Art.21"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-dsr-007", text: "Are safeguards in place against decisions based solely on automated processing?", hint: "Art.22 protects against solely automated decision-making.", opts: ["Yes -- human review for all automated decisions with significant impact", "Some automated decisions reviewed, others not", "Aware of requirement but not implemented", "No safeguards against automated decisions"], controls: ["Art.22"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Consent Management": [
      { id: "gdpr-cm-001", text: "Is consent freely given, specific, informed, and unambiguous?", hint: "Art.7 requires freely given, specific, informed, and unambiguous consent.", opts: ["Yes -- granular opt-in with clear language for each purpose", "Consent obtained but not fully granular", "Implied consent or pre-ticked boxes used", "No consent mechanism in place"], controls: ["Art.4(11)", "Art.7"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-cm-002", text: "Can consent be withdrawn as easily as it is given?", hint: "Art.7(3) mandates withdrawal must be as easy as giving consent.", opts: ["Yes -- one-click withdrawal, actioned immediately", "Withdrawal possible but requires extra steps", "Withdrawal process is difficult or unclear", "No withdrawal mechanism exists"], controls: ["Art.7(3)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-cm-003", text: "Is consent separately obtained for different processing purposes?", hint: "Consent must be granular for separate purposes.", opts: ["Yes -- separate consents for each distinct purpose", "Some purposes grouped together", "Single consent for all processing", "No consent segregation"], controls: ["Art.7", "Art.6(1)(a)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-cm-004", text: "For children under 16 (or applicable national age), is parental consent obtained?", hint: "Art.8 requires parental consent for children under 16.", opts: ["Yes -- verifiable parental consent with age verification", "Age verification in place but parental consent process weak", "Aware of requirement but not implemented", "No child-specific consent mechanism"], controls: ["Art.8"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Security of Processing": [
      { id: "gdpr-sp-001", text: "Does the organisation implement appropriate technical and organisational measures (TOMs)?", hint: "Art.32 requires appropriate TOMs to ensure security.", opts: ["Yes -- comprehensive TOMs documented and audited regularly", "TOMs in place but not fully documented", "Basic security measures only", "No formal security measures"], controls: ["Art.32"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-sp-002", text: "Are encryption, pseudonymisation, access control, and logging implemented?", hint: "Art.32(1) specifies key security measures.", opts: ["Yes -- all four implemented with regular reviews", "Most implemented but some gaps", "Partial implementation", "None implemented"], controls: ["Art.32(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-sp-003", text: "Are regular security assessments and vulnerability tests conducted?", hint: "Art.32 requires regular testing of security measures.", opts: ["Yes -- quarterly assessments with management reporting", "Annual security assessments", "Ad-hoc testing only", "No security assessments"], controls: ["Art.32(1)(d)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-sp-004", text: "Is there a documented incident response plan?", hint: "Art.32 requires ability to respond to security incidents.", opts: ["Yes -- tested incident response plan with regular drills", "Plan documented but untested", "Informal response procedures", "No incident response plan"], controls: ["Art.32"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Personal Data Breach Notification": [
      { id: "gdpr-bn-001", text: "Are data breaches reported to the supervisory authority within 72 hours of awareness?", hint: "Art.33 requires notification within 72 hours.", opts: ["Yes -- formal process with detection, escalation, and reporting within 72h", "Process exists but untested or slow", "Aware of requirement but no formal process", "No breach notification process"], controls: ["Art.33"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-bn-002", text: "Are high-risk breaches communicated to affected individuals without undue delay?", hint: "Art.34 requires communication to affected individuals for high-risk breaches.", opts: ["Yes -- tested communication templates and notification procedures", "Process exists but templates not pre-approved", "Informal notification on case-by-case basis", "No process for notifying affected individuals"], controls: ["Art.34"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-bn-003", text: "Are breach incidents documented in an internal breach register?", hint: "Art.33(5) requires documentation of all breaches.", opts: ["Yes -- comprehensive breach register with root cause analysis", "Register maintained but incomplete", "Informal incident logging", "No breach register maintained"], controls: ["Art.33(5)"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Data Protection Impact Assessment (DPIA)": [
      { id: "gdpr-dpia-001", text: "Is a DPIA conducted for high-risk processing activities?", hint: "Art.35 requires DPIA for high-risk processing.", opts: ["Yes -- formal DPIA process with documented outcomes and risk mitigation", "DPIAs done ad-hoc for some projects", "Aware of requirement but not consistently applied", "No DPIA process"], controls: ["Art.35"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-dpia-002", text: "Does the DPIA assess risks to rights and freedoms of data subjects?", hint: "Art.35(7) specifies minimum content of a DPIA.", opts: ["Yes -- systematic risk assessment with data subject impact analysis", "Risk assessment included but not comprehensive", "Basic risk checklist only", "No risk assessment in DPIAs"], controls: ["Art.35(7)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-dpia-003", text: "Are mitigation measures documented and implemented?", hint: "Art.35 requires documentation of measures to address risks.", opts: ["Yes -- measures documented with owners, timelines, and tracking", "Measures identified but not systematically tracked", "Informal remediation planning", "No mitigation measures documented"], controls: ["Art.35(7)(d)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-dpia-004", text: "Is the supervisory authority consulted when residual risk remains high?", hint: "Art.36 requires prior consultation with authority if high residual risk.", opts: ["Yes -- formal consultation process with documented outcomes", "Consultation conducted for major high-risk cases", "Aware of requirement but not practiced", "No consultation with supervisory authority"], controls: ["Art.36"], depth: ["deep"], weight: 1.4 },
    ],
    "Data Protection Officer (DPO)": [
      { id: "gdpr-dpo-001", text: "Has a Data Protection Officer been appointed where required?", hint: "Art.37 requires DPO for public authorities, large-scale monitoring, or special category data.", opts: ["Yes -- DPO appointed with independence, expertise, and adequate resources", "DPO appointed but lacks independence or resources", "DPO role assigned informally or shared", "No DPO appointed despite requirement"], controls: ["Art.37"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-dpo-002", text: "Does the DPO operate independently without conflict of interest?", hint: "Art.38(3) requires the DPO to perform duties independently.", opts: ["Yes -- DPO is independent with no conflicting roles", "DPO has some independence but some conflicts exist", "DPO role combined with conflicting responsibilities", "No independence safeguards"], controls: ["Art.38(3)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-dpo-003", text: "Does the DPO report to the highest management level?", hint: "Art.38(3) requires DPO to report directly to highest management.", opts: ["Yes -- DPO reports directly to board/senior management", "DPO reports to middle management", "DPO reports to operational/legal team", "No direct reporting line"], controls: ["Art.38(3)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-dpo-004", text: "Is the DPO involved in all DPIAs and compliance monitoring?", hint: "Art.39 outlines tasks of the DPO.", opts: ["Yes -- DPO involved in all privacy matters and compliance monitoring", "DPO involved in most key initiatives", "DPO consulted only when required", "DPO not involved in compliance activities"], controls: ["Art.39"], depth: ["deep"], weight: 1.3 },
    ],
    "International Data Transfers": [
      { id: "gdpr-idt-001", text: "Are personal data transfers outside the EU conducted under approved safeguards?", hint: "Art.44 requires appropriate safeguards for transfers.", opts: ["Yes -- all transfers covered by approved safeguards", "Most transfers covered but some lack formal safeguards", "Informal arrangements for some transfers", "No safeguards in place"], controls: ["Art.44"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-idt-002", text: "Are Standard Contractual Clauses (SCCs) or adequacy decisions used?", hint: "Art.46 allows transfers based on SCCs, BCRs, or adequacy decisions.", opts: ["Yes -- SCCs or adequacy decisions documented for all transfers", "Used for most, but some transfers lack formal mechanisms", "Aware of requirement but inconsistently applied", "No transfer mechanisms used"], controls: ["Art.46"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-idt-003", text: "Is risk assessment performed for third-country data transfers (post-Schrems II compliance)?", hint: "Post-Schrems II requires Transfer Impact Assessments (TIAs).", opts: ["Yes -- documented TIAs for all transfers", "TIAs conducted for high-risk transfers only", "Aware of requirement but not systematically applied", "No TIAs conducted"], controls: ["Art.46", "Art.28"], depth: ["deep"], weight: 1.4 },
      { id: "gdpr-idt-004", text: "Are Binding Corporate Rules (BCRs) used where applicable?", hint: "Art.47 allows BCRs as a transfer mechanism.", opts: ["Yes -- BCRs approved and implemented", "BCRs drafted but not yet approved", "Aware of BCRs but not pursued", "No BCRs in place"], controls: ["Art.47"], depth: ["deep"], weight: 1.2 },
    ],
    "Records of Processing Activities (ROPA)": [
      { id: "gdpr-ropa-001", text: "Does the organisation maintain a record of all processing activities?", hint: "Art.30 requires a record of processing activities.", opts: ["Yes -- comprehensive ROPA with regular updates and review", "ROPA maintained but incomplete or outdated", "Partial documentation of some processing activities", "No ROPA maintained"], controls: ["Art.30"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-ropa-002", text: "Does ROPA include purpose, categories of data, recipients, retention, and safeguards?", hint: "Art.30(1) specifies required ROPA content.", opts: ["Yes -- all required fields documented for each processing activity", "Most fields included but some gaps", "Basic information recorded only", "No structured ROPA"], controls: ["Art.30(1)"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-ropa-003", text: "Is ROPA updated regularly?", hint: "Art.30 requires records kept up to date.", opts: ["Yes -- updated within each processing change and reviewed annually", "Updated periodically but not systematically", "Rarely updated", "Never updated after initial creation"], controls: ["Art.30"], depth: ["deep"], weight: 1.2 },
    ],
    "Privacy by Design & Default": [
      { id: "gdpr-pbd-001", text: "Are data protection principles embedded into system design from the start?", hint: "Art.25(1) requires data protection by design.", opts: ["Yes -- privacy-by-design methodology integrated into SDLC", "Major projects consider privacy but not systematically", "Privacy considered only when required", "No privacy-by-design approach"], controls: ["Art.25(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-pbd-002", text: "Are default settings configured to collect minimal personal data?", hint: "Art.25(2) requires data protection by default.", opts: ["Yes -- privacy-preserving defaults enforced across all systems", "Some systems configured with privacy defaults", "Default settings collect more data than necessary", "No privacy-by-default configuration"], controls: ["Art.25(2)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-pbd-003", text: "Are privacy controls integrated into the product development lifecycle?", hint: "Art.25 requires embedding privacy into development.", opts: ["Yes -- privacy requirements included in all design and development phases", "Privacy reviews conducted at key milestones", "Privacy considered only at launch", "No privacy integration in development"], controls: ["Art.25"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Supervisory Authority & Compliance Cooperation": [
      { id: "gdpr-sa-001", text: "Does the organisation cooperate with supervisory authorities upon request?", hint: "Art.31 requires cooperation with supervisory authority.", opts: ["Yes -- proactive cooperation with documented response process", "Cooperate when contacted but no dedicated process", "Reactive cooperation only", "No cooperation with supervisory authority"], controls: ["Art.31"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-sa-002", text: "Are compliance audits supported with proper documentation?", hint: "Art.58 gives authorities power to audit.", opts: ["Yes -- comprehensive documentation readily available for audits", "Documentation exists but not well organized", "Limited documentation available", "No audit-ready documentation"], controls: ["Art.58", "Art.30"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "gdpr-sa-003", text: "Is there a process to respond to regulatory investigations?", hint: "Art.58 grants investigative powers to authorities.", opts: ["Yes -- established process with legal counsel and designated contact", "Process exists but not formalized", "Ad-hoc response to investigations", "No process for regulatory investigations"], controls: ["Art.58"], depth: ["deep"], weight: 1.2 },
    ],
    "Third-Party & Processor Management": [
      { id: "gdpr-tpm-001", text: "Are Data Processing Agreements (DPAs) signed with all processors?", hint: "Art.28(3) requires a contract with processors.", opts: ["Yes -- DPAs signed with all processors, meeting all Art.28 requirements", "Most processors have DPAs but some gaps", "Some processors engaged without formal DPA", "No DPAs in place"], controls: ["Art.28(3)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "gdpr-tpm-002", text: "Are processors evaluated for GDPR compliance before onboarding?", hint: "Art.28(1) requires due diligence on processors.", opts: ["Yes -- formal due diligence conducted before onboarding all processors", "Basic evaluation for high-risk processors only", "Informal checks before onboarding", "No evaluation of processors"], controls: ["Art.28(1)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "gdpr-tpm-003", text: "Are sub-processors disclosed and controlled?", hint: "Art.28(2) requires authorization for sub-processors.", opts: ["Yes -- all sub-processors authorized in writing with audit rights", "Sub-processors disclosed but authorization process informal", "Aware of requirement but not enforced", "No control over sub-processors"], controls: ["Art.28(2)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },
  "DPDP Act": {
    "Data Minimisation, Purpose & Retention": [
      { id: "dpdp-dm-001", text: "Does the organization ensure that digital personal data is processed solely for a lawful purpose for which the Data Principal has given consent or for certain legitimate uses?", hint: "Section 4(1) and 4(2) require processing only for lawful purposes.", opts: ["Yes -- processing strictly limited to consented or legitimate purposes", "Mostly limited but some processing without clear basis", "Multiple activities lack clear lawful basis", "No controls on processing purposes"], controls: ["S.4(1)", "S.4(2)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-dm-002", text: "Is the collection of personal data strictly limited to only what is necessary to serve the specified, itemized purpose?", hint: "Section 6(1) requires data collection limited to what is necessary.", opts: ["Yes -- strict data minimization enforced with regular audits", "Mostly limited but some excess data collected", "Broad collection without clear necessity assessment", "No limitation on data collection"], controls: ["S.6(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-dm-003", text: "Does the organization erase personal data as soon as the specified purpose of its collection is no longer served?", hint: "Section 8(7)(a) mandates erasure once purpose is served.", opts: ["Yes -- automated deletion with verification upon purpose completion", "Manual review-based deletion process", "Deletion performed inconsistently", "Data retained indefinitely"], controls: ["S.8(7)(a)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-dm-004", text: "Is personal data systematically deleted when a Data Principal withdraws their consent, provided there is no explicit statutory retention requirement?", hint: "Section 8(7)(b) requires deletion upon consent withdrawal.", opts: ["Yes -- automated deletion triggered by consent withdrawal", "Manual deletion upon withdrawal request", "Inconsistent handling of withdrawal-related deletion", "No deletion upon withdrawal"], controls: ["S.8(7)(b)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-dm-005", text: "When engaging a Data Processor, does the company execute a Data Processing Agreement (DPA) ensuring the processor deletes data matching the organization retention schedule?", hint: "Section 8(1) requires contractual controls with processors.", opts: ["Yes -- DPAs executed with all processors including deletion obligations", "Most processors covered but some gaps", "Processor agreements exist without specific deletion clauses", "No DPAs with processors"], controls: ["S.8(1)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Consent and Notice Management": [
      { id: "dpdp-cn-001", text: "Does the organization provide an independent, clear, and plain-language Notice to the Data Principal before or at the time of seeking consent?", hint: "Section 5(1) requires a clear notice before or at time of consent.", opts: ["Yes -- clear, plain-language notice provided at every collection point", "Notice provided but not always before consent", "Notice exists but unclear or overly complex", "No formal notice provided"], controls: ["S.5(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-cn-002", text: "Does your privacy notice explicitly itemize the exact categories of personal data being collected and the distinct purposes for which it will be processed?", hint: "Section 5(1)(a) and (b) require itemization.", opts: ["Yes -- detailed breakdown of data categories and purposes in the notice", "Categories listed but not fully itemized", "Generic description without detail", "No itemization in notice"], controls: ["S.5(1)(a)", "S.5(1)(b)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-cn-003", text: "Does the notice explicitly state how the Data Principal can exercise their rights and how they can file a complaint with the Data Protection Board of India (DPBI)?", hint: "Section 5(1)(c) requires rights and grievance mechanism in notice.", opts: ["Yes -- rights exercise process and DPBI complaint mechanism clearly explained", "Basic rights mentioned but not comprehensive", "Rights mentioned without DPBI complaint process", "No rights information in notice"], controls: ["S.5(1)(c)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-cn-004", text: "Is the option to view the notice and give consent made available in English as well as all 22 scheduled regional languages of India?", hint: "Section 5(3) requires notice in English and all 8th Schedule languages.", opts: ["Yes -- available in English and multiple regional languages as requested", "Available in English and a few major regional languages", "Available in English only", "No multi-language support"], controls: ["S.5(3)"], depth: ["intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-cn-005", text: "Is the consent obtained from individuals free, specific, informed, unconditional, and unambiguous, requiring a clear affirmative action?", hint: "Section 6(1) requires explicit and unambiguous consent.", opts: ["Yes -- consent is granular, explicit, and requires clear affirmative action", "Consent obtained but not meeting all criteria", "Implied consent used in some cases", "No formal consent mechanism"], controls: ["S.6(1)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-cn-006", text: "Is the mechanism provided for withdrawing consent as simple, accessible, and frictionless as the process used to grant consent?", hint: "Section 6(4) requires withdrawal as easy as giving consent.", opts: ["Yes -- one-click/simple withdrawal, as easy as giving consent", "Withdrawal possible but slightly more complex", "Withdrawal process is difficult or unclear", "No withdrawal mechanism exists"], controls: ["S.6(4)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Data Protection Officer (DPO) and Accountability": [
      { id: "dpdp-dpo-001", text: "Has the organization published the business contact details of a dedicated contact point or representative capable of answering queries regarding data processing?", hint: "Section 8(9) requires published contact details.", opts: ["Yes -- contact details published on website and in privacy notices", "Contact details available upon request only", "Contact point exists but details not easily accessible", "No dedicated contact for data processing queries"], controls: ["S.8(9)"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-dpo-002", text: "Has the organization appointed an India-based Data Protection Officer (DPO) who reports directly to the Board of Directors or highest governing body? (Applicable if classified as SDF)", hint: "Section 10(2)(a) requires SDFs to appoint an India-based DPO.", opts: ["Yes -- India-based DPO appointed, reporting directly to the Board", "DPO appointed but not India-based or not reporting to Board", "DPO role assigned informally without Board reporting", "No DPO appointed"], controls: ["S.10(2)(a)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Significant Data Fiduciary (SDF) Additional Obligations": [
      { id: "dpdp-sdf-001", text: "Has the organization appointed an independent, external Data Auditor to periodically audit compliance metrics?", hint: "Section 10(2)(b) requires SDFs to appoint an independent data auditor.", opts: ["Yes -- independent data auditor appointed with defined audit schedule", "Audit planned but auditor not yet appointed", "Aware of requirement, no action taken", "Not implemented"], controls: ["S.10(2)(b)"], depth: ["intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-sdf-002", text: "Does the organization conduct regular Data Protection Impact Assessments (DPIA) that detail the description, risk mapping, and mitigation measures?", hint: "Section 10(2)(c) requires SDFs to conduct regular DPIAs.", opts: ["Yes -- formal DPIAs with risk mapping and mitigation documented", "DPIAs conducted but not comprehensive", "Aware of requirement but inconsistently applied", "No DPIAs conducted"], controls: ["S.10(2)(c)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-sdf-003", text: "Does the company perform periodic audits of its technological architecture and corporate governance controls?", hint: "Section 10(2)(d) requires periodic audits of technology and governance.", opts: ["Yes -- periodic audits with documented findings and remediation", "Audits conducted but not on a defined schedule", "Ad-hoc reviews only", "No periodic audits"], controls: ["S.10(2)(d)"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
    "Security Safeguards and Breach Notification": [
      { id: "dpdp-sb-001", text: "Does the organization implement reasonable security safeguards (encryption, access controls, network security) to prevent personal data breaches?", hint: "Section 8(5) requires reasonable security safeguards.", opts: ["Yes -- encryption, MFA, access controls, and network security in place", "Basic safeguards in place (firewall, antivirus)", "Minimal controls with significant gaps", "No security safeguards implemented"], controls: ["S.8(5)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-sb-002", text: "In the event of a personal data breach, does the company have an incident response workflow to promptly notify both the Data Protection Board of India (DPBI) and all affected Data Principals?", hint: "Section 8(6) requires breach notification.", opts: ["Yes -- formal incident response with notification workflows for both authorities and affected parties", "Process exists but untested", "Informal notification plan", "No breach notification process"], controls: ["S.8(6)"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-sb-003", text: "Are technical controls in place to verify and maintain the accuracy, completeness, and consistency of personal data when it is shared with another Data Fiduciary?", hint: "Section 8(3) requires accuracy controls for shared data.", opts: ["Yes -- automated validation and reconciliation controls for shared data", "Manual verification before data sharing", "Basic checks only", "No accuracy controls for shared data"], controls: ["S.8(3)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Data Principal Rights and Obligations": [
      { id: "dpdp-dpr-001", text: "Does the organisation provide Data Principals with the right to access personal data being processed?", hint: "Section 11(1)(a) and (b) grant right to access.", opts: ["Yes -- self-service portal with automated access within statutory timelines", "Manual process, completed within timelines", "Access possible but slow and inconsistent", "No access mechanism available"], controls: ["S.11(1)(a)", "S.11(1)(b)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-dpr-002", text: "Is there a process to allow Data Principals to request correction, completion, updating, or erasure of data?", hint: "Section 12(1) and (2) cover right to correction and erasure.", opts: ["Yes -- documented process with timely fulfillment and tracking", "Process exists but fulfillment time is inconsistent", "Informal handling of requests", "No process for correction or erasure"], controls: ["S.12(1)", "S.12(2)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-dpr-003", text: "Are Data Principals informed about how to exercise their rights in the privacy notice?", hint: "The notice must explain how rights can be exercised.", opts: ["Yes -- rights exercise process clearly explained in the notice", "Rights mentioned but exercise process unclear", "Minimal information about rights", "No rights information in notice"], controls: ["S.5(1)(c)", "S.11"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Cross-Border Data Transfers and Processing": [
      { id: "dpdp-xb-001", text: "Does the organisation transfer personal data outside India only as per government-notified restrictions or whitelisting framework?", hint: "Section 14 mandates cross-border transfer restrictions.", opts: ["Yes -- transfers comply with government restrictions and whitelist requirements", "Transfers monitored but compliance not fully verified", "Transfers made without checking restrictions", "No controls on cross-border transfers"], controls: ["S.14"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-xb-002", text: "Are contractual safeguards in place with foreign entities receiving personal data?", hint: "Contracts with foreign entities must include data protection obligations.", opts: ["Yes -- contracts include security, audit, and breach notification clauses", "Most contracts have basic protections", "Some foreign entities engaged without contracts", "No contractual safeguards"], controls: ["S.8(1)", "S.14"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-xb-003", text: "Is there a mechanism to track where data is stored and processed internationally?", hint: "Organisations should maintain visibility over data storage locations.", opts: ["Yes -- data residency map maintained with regular updates", "Partial tracking of data locations", "Informal knowledge of data storage locations", "No data location tracking"], controls: ["S.14"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-xb-004", text: "Are cross-border transfers periodically reviewed for compliance with government restrictions?", hint: "Periodic review of transfer mechanisms is required.", opts: ["Yes -- quarterly reviews with documented compliance assessments", "Annual reviews of transfer compliance", "Ad-hoc reviews only", "No periodic reviews"], controls: ["S.14"], depth: ["deep"], weight: 1.2 },
    ],
    "Data Retention and Deletion": [
      { id: "dpdp-ret-001", text: "Does the organisation retain personal data only as long as necessary for the stated purpose?", hint: "Section 8(7)(a) requires retention only as long as the purpose is served.", opts: ["Yes -- automated retention enforcement with defined schedules", "Manual review of retention periodically", "Retention policy exists but not consistently enforced", "Data retained indefinitely"], controls: ["S.8(7)(a)"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-ret-002", text: "Is there an automated or defined process for secure deletion or anonymisation after the retention period expires?", hint: "Data must be securely deleted or anonymised.", opts: ["Yes -- automated secure deletion with verification and audit trail", "Manual deletion with defined procedures", "Deletion performed inconsistently", "No deletion process in place"], controls: ["S.8(7)"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-ret-003", text: "Are retention schedules defined per data category?", hint: "Different data categories may have different retention requirements.", opts: ["Yes -- comprehensive retention schedules by data category with legal review", "Retention defined for major categories only", "Generic retention policy without category specificity", "No retention schedules defined"], controls: ["S.8(7)"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Grievance Redressal Mechanism": [
      { id: "dpdp-grm-001", text: "Does the organisation have a designated Grievance Officer?", hint: "Section 12 requires a mechanism for addressing data principal grievances.", opts: ["Yes -- designated Grievance Officer with published contact details", "Grievance Officer appointed but contact not easily accessible", "Informal grievance handling", "No Grievance Officer designated"], controls: ["S.12"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "dpdp-grm-002", text: "Are grievances acknowledged and resolved within defined timelines?", hint: "Grievance redressal should follow defined timelines.", opts: ["Yes -- tracked with SLA monitoring and escalation procedures", "Process exists but timelines not always met", "Ad-hoc resolution without timeline tracking", "No grievance resolution process"], controls: ["S.12"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "dpdp-grm-003", text: "Is there a transparent escalation mechanism to the Data Protection Board if unresolved?", hint: "Data principals should have recourse to DPBI for unresolved grievances.", opts: ["Yes -- escalation to DPBI clearly communicated in grievance responses", "Escalation mentioned but process unclear", "Aware of DPBI but no escalation process", "No escalation mechanism"], controls: ["S.12", "S.28"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Children Data Protection": [
      { id: "dpdp-ch-001", text: "Does the organisation obtain verifiable parental consent before processing children data?", hint: "Section 9 requires verifiable parental consent for children data.", opts: ["Yes -- age-gating with verifiable parental consent mechanism", "Age-gating in place but parental consent not always verified", "Aware of requirement but no formal process", "No controls for children data processing"], controls: ["S.9"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-ch-002", text: "Is profiling, targeted advertising, or tracking restricted for children?", hint: "Section 9 prohibits harmful processing of children data.", opts: ["Yes -- strict restrictions enforced with technical controls", "Mostly restricted but some gaps exist", "Aware of restrictions but not fully implemented", "No restrictions on children data processing"], controls: ["S.9"], depth: ["intermediate", "deep"], weight: 1.5 },
      { id: "dpdp-ch-003", text: "Are age verification mechanisms implemented where applicable?", hint: "Appropriate age verification for online services.", opts: ["Yes -- robust age verification with privacy-preserving mechanisms", "Basic age gate implemented", "Aware of requirement but not implemented", "No age verification"], controls: ["S.9"], depth: ["intermediate", "deep"], weight: 1.4 },
    ],
  },
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
  // ─────────────────────────────────────────────────────────────────
  // ISO/IEC 27001 — Information Security Management
  // ─────────────────────────────────────────────────────────────────
  "ISO/IEC 27001": {
    "Context of the Organization": [
      { id: "iso-gov-001", text: "Has the organization defined the scope of the Information Security Management System (ISMS) with clear boundaries?", hint: "Clause 4.3 requires defining the scope of the ISMS considering internal and external issues.", opts: ["Yes -- ISMS scope clearly defined with documented boundaries and exclusions", "Scope defined but boundaries unclear", "Informal scope understanding", "No ISMS scope defined"], controls: ["4.3", "4.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-gov-002", text: "Are internal and external interested parties (stakeholders) identified and their requirements documented?", hint: "Clause 4.2 requires identification of interested parties and their requirements.", opts: ["Yes -- all stakeholders identified with documented requirements and review process", "Major stakeholders identified but not fully documented", "Stakeholders known informally", "No stakeholder identification"], controls: ["4.2"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "iso-gov-003", text: "Is there an approved information security policy aligned with business objectives?", hint: "Clause 5.2 requires top management to establish an information security policy.", opts: ["Yes -- policy approved by management, aligned with business objectives, and communicated", "Policy exists but alignment with business is unclear", "Policy exists but outdated", "No information security policy"], controls: ["5.2", "A.5.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-gov-004", text: "Are ISMS roles, responsibilities, and authorities clearly defined and communicated?", hint: "Clause 5.3 requires top management to ensure responsibilities are assigned.", opts: ["Yes -- roles and responsibilities documented in RACI matrix and communicated", "Roles defined but not systematically communicated", "Informal role assignment", "No defined ISMS roles"], controls: ["5.3", "A.6.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
    ],
    "Risk Management & Risk Assessment": [
      { id: "iso-risk-001", text: "Does the organization follow a formal risk assessment methodology for identifying information security risks?", hint: "Clause 6.1.2 requires a defined risk assessment process.", opts: ["Yes -- formal methodology with documented criteria, process, and regular execution", "Methodology exists but not consistently followed", "Ad-hoc risk assessments", "No formal risk assessment process"], controls: ["6.1.2", "A.8.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-risk-002", text: "Are risks evaluated based on likelihood and impact using a defined risk criteria?", hint: "Clause 6.1.2 requires defined risk acceptance criteria.", opts: ["Yes -- likelihood/impact matrix with defined acceptance criteria", "Basic risk scoring without formal criteria", "Informal risk evaluation", "No risk evaluation criteria"], controls: ["6.1.2"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-risk-003", text: "Is there a documented and approved risk treatment plan for all identified risks?", hint: "Clause 6.1.3 requires a risk treatment plan with owners and timelines.", opts: ["Yes -- comprehensive plan with owners, timelines, and regular progress reviews", "Treatment plan exists for major risks only", "Informal treatment tracking", "No risk treatment plan"], controls: ["6.1.3", "A.8.3"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-risk-004", text: "Are risk assessments reviewed and updated periodically or after major changes?", hint: "Clause 6.1.2 requires periodic reviews and updates to risk assessments.", opts: ["Yes -- scheduled reviews with additional triggers for major changes", "Annual reviews only", "Reactive reviews after incidents", "No review process"], controls: ["6.1.2"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Asset Management": [
      { id: "iso-ast-001", text: "Is there a complete and up-to-date inventory of information assets?", hint: "Clause A.8.1 requires an asset inventory aligned with the ISMS.", opts: ["Yes -- maintained asset inventory with automated discovery and ownership", "Manual inventory, partially complete", "Spreadsheet-based, often outdated", "No formal asset inventory"], controls: ["A.8.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-ast-002", text: "Are assets classified based on confidentiality, integrity, and availability requirements?", hint: "Clause A.8.2 requires information classification in accordance with organisational needs.", opts: ["Yes -- classification scheme implemented across all assets with handling procedures", "Classification applied to critical assets only", "Informal classification", "No classification"], controls: ["A.8.2"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "iso-ast-003", text: "Are asset owners formally assigned and responsible for asset protection?", hint: "Clause A.8.1 requires ownership of all assets.", opts: ["Yes -- all assets have nominated owners with documented responsibilities", "Most assets have owners but not formally documented", "Ownership informally assigned", "No asset ownership defined"], controls: ["A.8.1"], depth: ["intermediate", "deep"], weight: 1.2 },
      { id: "iso-ast-004", text: "Are acceptable use rules defined and communicated for all information assets?", hint: "Clause A.8.3 requires documented acceptable use rules.", opts: ["Yes -- documented rules communicated to all users and acknowledged", "Rules exist for critical systems only", "Informal acceptable use guidelines", "No acceptable use rules"], controls: ["A.8.3"], depth: ["intermediate", "deep"], weight: 1.2 },
    ],
    "Access Control": [
      { id: "iso-acc-001", text: "Is access to systems granted based on the principle of least privilege?", hint: "Clause A.9.1 requires access control based on least privilege.", opts: ["Yes -- least privilege enforced across all systems with periodic reviews", "Mostly enforced but some legacy systems have broad access", "Limited enforcement of least privilege", "No least privilege controls"], controls: ["A.9.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-acc-002", text: "Is there a formal user access provisioning and de-provisioning process?", hint: "Clause A.9.2 requires a formal user access management process.", opts: ["Yes -- automated provisioning/deprovisioning with access reviews", "Manual process with defined procedures", "Informal access management", "No formal process"], controls: ["A.9.2"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-acc-003", text: "Are privileged accounts monitored and regularly reviewed?", hint: "Clause A.9.2 requires management of privileged access rights.", opts: ["Yes -- quarterly reviews with logging, monitoring, and MFA for privileged accounts", "Annual reviews with basic monitoring", "Privileged accounts exist without regular review", "No privileged access controls"], controls: ["A.9.2"], depth: ["intermediate", "deep"], weight: 1.5 },
      { id: "iso-acc-004", text: "Is multi-factor authentication implemented for critical systems?", hint: "Clause A.9.4 requires secure authentication for access to systems and applications.", opts: ["Yes -- MFA enforced for all critical systems and privileged access", "MFA for privileged access only", "MFA planned but not deployed", "No MFA implemented"], controls: ["A.9.4", "A.9.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
    ],
    "Cryptography & Data Protection": [
      { id: "iso-crypto-001", text: "Are encryption standards defined for data at rest and in transit?", hint: "Clause A.10.1 requires cryptographic controls for protection of information.", opts: ["Yes -- defined encryption standards enforced with key management", "AES-256 at rest and TLS 1.2 in transit on major systems", "Partial encryption coverage", "No encryption standards defined"], controls: ["A.10.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-crypto-002", text: "Is cryptographic key management formally defined and secured?", hint: "Clause A.10.1 requires a policy on use of cryptographic controls and key management.", opts: ["Yes -- formal key lifecycle management with HSM or secure key store", "Key management defined but not fully automated", "Informal key management", "No key management process"], controls: ["A.10.1"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "iso-crypto-003", text: "Are sensitive data handling procedures documented and enforced?", hint: "Clause A.8.2 requires procedures for handling labelled information.", opts: ["Yes -- documented procedures for handling, storing, and transmitting sensitive data", "Procedures exist for critical data types", "Informal handling guidelines", "No data handling procedures"], controls: ["A.8.2"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "iso-crypto-004", text: "Is data masking or anonymization used where applicable?", hint: "Clause A.8.11 covers data masking and A.8.10 covers information deletion.", opts: ["Yes -- data masking and anonymization applied based on data classification", "Used in some environments but not consistently", "Aware of requirement but not implemented", "No masking or anonymization"], controls: ["A.8.11", "A.8.10"], depth: ["deep"], weight: 1.2 },
    ],
    "Physical & Environmental Security": [
      { id: "iso-phy-001", text: "Are physical access controls implemented for secure areas (server rooms, data centers)?", hint: "Clause A.11.1 requires physical security perimeters to protect premises.", opts: ["Yes -- multi-factor physical access with logging, visitor management, and monitoring", "Badge access with visitor logs", "Basic door locks only", "No physical access controls"], controls: ["A.11.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-phy-002", text: "Is visitor access logged, authorized, and monitored?", hint: "Clause A.11.1 requires visitor access controls.", opts: ["Yes -- visitor registration, authorization, and escort procedures in place", "Visitor log maintained but escort not always enforced", "Informal visitor management", "No visitor controls"], controls: ["A.11.1"], depth: ["intermediate", "deep"], weight: 1.2 },
      { id: "iso-phy-003", text: "Are environmental controls (fire suppression, temperature, humidity) in place?", hint: "Clause A.11.2 requires protection against environmental threats.", opts: ["Yes -- comprehensive environmental monitoring with automatic response systems", "Fire suppression and basic environmental controls", "Basic protections only", "No environmental controls"], controls: ["A.11.2"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "iso-phy-004", text: "Are critical assets protected against unauthorized physical access or damage?", hint: "Clause A.11.2 requires security for equipment off-premises and removal of property.", opts: ["Yes -- asset tracking, tamper detection, and secure storage for critical assets", "Locked cabinets and tracking for critical assets", "Informal physical protection", "No physical asset protection"], controls: ["A.11.2"], depth: ["deep"], weight: 1.2 },
    ],
    "Operations Security": [
      { id: "iso-ops-001", text: "Are operational procedures documented for system management activities?", hint: "Clause A.12.1 requires documented operating procedures.", opts: ["Yes -- comprehensive SOPs with version control and regular reviews", "Key procedures documented, others informal", "Mostly informal procedures", "No formal documentation"], controls: ["A.12.1"], depth: ["quick", "intermediate", "deep"], weight: 1.3 },
      { id: "iso-ops-002", text: "Is there a formal change management process including approval and testing?", hint: "Clause A.12.1 requires management of changes to information processing facilities.", opts: ["Yes -- formal change management with CAB, testing, and rollback procedures", "Change process exists but not consistently followed", "Informal change control", "No change management process"], controls: ["A.12.1", "A.14.2"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-ops-003", text: "Are backup procedures implemented and regularly tested for restoration?", hint: "Clause A.12.3 requires backup of information and regular testing.", opts: ["Yes -- automated backups with quarterly restoration tests and off-site storage", "Regular backups with occasional restoration tests", "Backups performed but not tested", "No formal backup process"], controls: ["A.12.3"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-ops-004", text: "Are logs of critical systems collected, protected, and reviewed?", hint: "Clause A.12.4 requires logging and monitoring of events.", opts: ["Yes -- centralized logging with SIEM, tamper protection, and daily reviews", "Logs collected with periodic reviews", "Basic logging on some systems only", "No logging or log review"], controls: ["A.12.4"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
    ],
    "Incident Management": [
      { id: "iso-inc-001", text: "Is there a formal information security incident response procedure?", hint: "Clause A.16.1 requires management responsibilities and procedures for incidents.", opts: ["Yes -- documented IR plan with roles, escalation, and communication templates", "Plan documented but untested", "Informal response procedures only", "No incident response plan"], controls: ["A.16.1"], depth: ["quick", "intermediate", "deep"], weight: 1.5 },
      { id: "iso-inc-002", text: "Are incidents classified, recorded, and tracked to resolution?", hint: "Clause A.16.1 requires reporting and recording of security events.", opts: ["Yes -- incident register with classification, ownership, and closure tracking", "Spreadsheet-based tracking", "Informal logging only", "No systematic incident tracking"], controls: ["A.16.1"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "iso-inc-003", text: "Is there a defined escalation mechanism for major security incidents?", hint: "Clause A.16.1 requires communication and escalation of incidents.", opts: ["Yes -- defined escalation paths with SLA-based timelines", "Escalation process exists but untested", "Informal escalation on case-by-case basis", "No defined escalation mechanism"], controls: ["A.16.1"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "iso-inc-004", text: "Are post-incident reviews conducted and lessons learned documented?", hint: "Clause A.16.1 requires collection of evidence and lessons learned.", opts: ["Yes -- formal post-incident reviews with documented action items and trend analysis", "Reviews conducted for major incidents only", "Informal discussions after incidents", "No post-incident reviews"], controls: ["A.16.1"], depth: ["deep"], weight: 1.3 },
    ],
    "Supplier & Third-Party Security": [
      { id: "iso-sup-001", text: "Are security requirements included in supplier contracts and agreements?", hint: "Clause A.15.1 requires security requirements in supplier agreements.", opts: ["Yes -- security clauses, SLAs, and audit rights in all supplier contracts", "Security requirements in most contracts", "Informal security expectations only", "No security requirements in contracts"], controls: ["A.15.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-sup-002", text: "Are third-party risks assessed before onboarding vendors?", hint: "Clause A.15.2 requires management of supplier service delivery.", opts: ["Yes -- risk-based due diligence for all third parties before onboarding", "Basic assessment for high-risk vendors only", "Informal vendor evaluation", "No third-party risk assessment"], controls: ["A.15.2"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "iso-sup-003", text: "Is supplier performance and compliance reviewed periodically?", hint: "Clause A.15.2 requires monitoring and review of supplier services.", opts: ["Yes -- regular supplier reviews with compliance verification and scorecards", "Annual reviews of major suppliers", "Ad-hoc performance checks", "No supplier reviews"], controls: ["A.15.2"], depth: ["intermediate", "deep"], weight: 1.3 },
      { id: "iso-sup-004", text: "Are data sharing and processing agreements in place where required?", hint: "Clause A.15.1 requires agreements to cover data processing requirements.", opts: ["Yes -- DPAs and data sharing agreements in place for all relevant third parties", "Agreements in place for critical data sharing", "Some agreements exist but not comprehensive", "No agreements in place"], controls: ["A.15.1", "A.15.2"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
    "Compliance & Legal Requirements": [
      { id: "iso-cmp-001", text: "Are applicable legal, regulatory, and contractual requirements identified and maintained?", hint: "Clause A.18.1 requires identification and documentation of legal and regulatory requirements.", opts: ["Yes -- maintained legal register with regular reviews and gap analysis", "Major requirements identified but not systematically tracked", "Informally known but not documented", "No legal/regulatory tracking"], controls: ["A.18.1"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-cmp-002", text: "Is compliance with policies and standards regularly audited?", hint: "Clause A.18.2 requires regular review of compliance.", opts: ["Yes -- scheduled internal audits with management review and corrective actions", "Periodic compliance checks", "Ad-hoc compliance reviews", "No compliance audits"], controls: ["A.18.2", "9.2"], depth: ["quick", "intermediate", "deep"], weight: 1.4 },
      { id: "iso-cmp-003", text: "Are internal ISMS audits conducted at planned intervals?", hint: "Clause 9.2 requires internal audits at planned intervals.", opts: ["Yes -- annual audit plan with independent auditors and management reporting", "Audits conducted but not consistently on schedule", "Ad-hoc internal audits", "No internal ISMS audits"], controls: ["9.2"], depth: ["intermediate", "deep"], weight: 1.4 },
      { id: "iso-cmp-004", text: "Are non-conformities tracked with corrective actions implemented?", hint: "Clause 10.1 requires management of non-conformities and corrective actions.", opts: ["Yes -- formal CAPA process with root cause analysis and verification of effectiveness", "Non-conformities logged with corrective actions assigned", "Informal issue tracking", "No corrective action process"], controls: ["10.1", "A.18.2"], depth: ["intermediate", "deep"], weight: 1.3 },
    ],
  },
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
