export const AUDIT_QUESTIONS = {
  internal: [
    {
      id: "ia_1",
      category: "Governance",
      text: "Is there a documented and approved Information Security Policy (ISP) that is reviewed annually?",
      hint: "Check for policy version history and management approval signatures."
    },
    {
      id: "ia_2",
      category: "Governance",
      text: "Are roles and responsibilities for security clearly defined across the organization?",
      hint: "Review job descriptions and the security organizational chart."
    },
    {
      id: "ia_3",
      category: "Access Control",
      text: "Is Multi-Factor Authentication (MFA) enforced for all remote access and privileged accounts?",
      hint: "Verify settings in your IDP (e.g., Azure AD, Okta)."
    },
    {
      id: "ia_4",
      category: "Access Control",
      text: "Are user access reviews performed at least quarterly for all critical systems?",
      hint: "Look for evidence of previous review logs and removal of stale accounts."
    },
    {
      id: "ia_5",
      category: "Data Protection",
      text: "Is sensitive data (PII/PHI) encrypted at rest using industry-standard algorithms (AES-256)?",
      hint: "Verify database and storage bucket encryption settings."
    },
    {
      id: "ia_6",
      category: "Data Protection",
      text: "Are data retention and disposal policies strictly enforced for both physical and digital media?",
      hint: "Check for automated deletion scripts or certificates of destruction."
    },
    {
      id: "ia_7",
      category: "Incident Response",
      text: "Is there a tested Incident Response Plan (IRP) with clearly defined escalation paths?",
      hint: "Check for the most recent tabletop exercise report."
    },
    {
      id: "ia_8",
      category: "Incident Response",
      text: "Are security incidents logged, classified, and tracked through to remediation?",
      hint: "Review the incident log or ticketing system (e.g., Jira, ServiceNow)."
    },
    {
      id: "ia_9",
      category: "Risk Management",
      text: "Is a formal risk assessment conducted at least annually or upon significant changes?",
      hint: "Review the latest risk register and management sign-off."
    },
    {
      id: "ia_10",
      category: "Vulnerability Management",
      text: "Are automated vulnerability scans performed weekly on all internal and external networks?",
      hint: "Check scan reports from tools like Nessus, Qualys, or OpenVAS."
    },
    {
      id: "ia_11",
      category: "Vulnerability Management",
      text: "Are critical patches applied within 30 days of release?",
      hint: "Review patch management logs and compliance reports."
    },
    {
      id: "ia_12",
      category: "Network Security",
      text: "Are firewalls and routers configured to block all traffic by default (Deny-All)?",
      hint: "Review firewall rules and configuration standards."
    },
    {
      id: "ia_13",
      category: "Network Security",
      text: "Is network segmentation implemented to isolate sensitive data environments (CDE/PII)?",
      hint: "Review network diagrams and VLAN configurations."
    },
    {
      id: "ia_14",
      category: "Physical Security",
      text: "Is physical access to data centers and server rooms restricted and logged?",
      hint: "Review badge access logs and visitor sign-in sheets."
    },
    {
      id: "ia_15",
      category: "Human Resources",
      text: "Are background checks performed for all new employees and contractors?",
      hint: "Verify HR onboarding checklists."
    },
    {
      id: "ia_16",
      category: "Training",
      text: "Do all employees complete security awareness training annually?",
      hint: "Check completion reports from the LMS."
    },
    {
      id: "ia_17",
      category: "Operations",
      text: "Are system backups performed daily and stored in an off-site, immutable location?",
      hint: "Verify backup logs and off-site replication status."
    },
    {
      id: "ia_18",
      category: "Operations",
      text: "Is there a formal Change Management process for all production system changes?",
      hint: "Review CAB (Change Advisory Board) meeting minutes."
    },
    {
      id: "ia_19",
      category: "Compliance",
      text: "Are all relevant regulatory requirements (GDPR, HIPAA, etc.) mapped to internal controls?",
      hint: "Review the compliance matrix."
    },
    {
      id: "ia_20",
      category: "Monitoring",
      text: "Are logs from critical systems centralized and monitored in real-time (SIEM)?",
      hint: "Verify SIEM alerts and dashboard activity."
    },
    {
      id: "ia_21",
      category: "Business Continuity",
      text: "Is the Business Continuity Plan (BCP) updated and tested annually?",
      hint: "Check for the latest DR/BCP test report."
    },
    {
      id: "ia_22",
      category: "Asset Management",
      text: "Is there an up-to-date inventory of all hardware and software assets?",
      hint: "Review the CMDB or asset tracking spreadsheet."
    }
  ],
  vendor: [
    {
      id: "va_1",
      category: "Vendor Governance",
      text: "Does the vendor maintain an ISO 27001 certification or SOC 2 Type II report?",
      hint: "Request a copy of the latest certificate or audit report."
    },
    {
      id: "va_2",
      category: "Data Privacy",
      text: "Does the vendor provide a Data Processing Agreement (DPA) that complies with GDPR/CCPA?",
      hint: "Review the vendor's standard DPA document."
    },
    {
      id: "va_3",
      category: "Access Control",
      text: "Does the vendor enforce MFA for their employees accessing your data?",
      hint: "Check the vendor's security whitepaper or questionnaire response."
    },
    {
      id: "va_4",
      category: "Data Protection",
      text: "Does the vendor encrypt your data at rest and in transit using strong encryption?",
      hint: "Verify encryption standards mentioned in the contract/SLA."
    },
    {
      id: "va_5",
      category: "Incident Management",
      text: "Does the vendor guarantee notification of a data breach within 48-72 hours?",
      hint: "Check the 'Notification' section of the security exhibit."
    },
    {
      id: "va_6",
      category: "Sub-processing",
      text: "Does the vendor disclose all 4th-party sub-processors used to provide the service?",
      hint: "Review the vendor's sub-processor list."
    },
    {
      id: "va_7",
      category: "Right to Audit",
      text: "Does the contract include a 'Right to Audit' clause for security assessments?",
      hint: "Check the Master Service Agreement (MSA)."
    },
    {
      id: "va_8",
      category: "Physical Security",
      text: "Are the vendor's data centers located in Tier III or higher facilities?",
      hint: "Verify data center specifications (e.g., AWS, Azure, Google Cloud)."
    },
    {
      id: "va_9",
      category: "Vulnerability Management",
      text: "Does the vendor perform regular penetration testing by independent third parties?",
      hint: "Request the executive summary of the latest pen-test."
    },
    {
      id: "va_10",
      category: "Business Continuity",
      text: "Does the vendor have a documented Disaster Recovery plan with specific RTO/RPO targets?",
      hint: "Review the vendor's DR/BCP overview."
    },
    {
      id: "va_11",
      category: "Application Security",
      text: "Does the vendor follow a Secure Software Development Lifecycle (S-SDLC)?",
      hint: "Review the vendor's development methodology documentation."
    },
    {
      id: "va_12",
      category: "HR Security",
      text: "Does the vendor perform background checks on employees with access to client data?",
      hint: "Verify vendor's HR security policies."
    },
    {
      id: "va_13",
      category: "Logging",
      text: "Does the vendor provide audit logs of access to your data/environment?",
      hint: "Check available logging features in the vendor's portal."
    },
    {
      id: "va_14",
      category: "Change Management",
      text: "Does the vendor notify customers of significant changes to their infrastructure?",
      hint: "Check the 'Change Notification' section of the SLA."
    },
    {
      id: "va_15",
      category: "Insurance",
      text: "Does the vendor maintain Cyber Liability Insurance with adequate coverage?",
      hint: "Request a Certificate of Insurance (COI)."
    },
    {
      id: "va_16",
      category: "Data Location",
      text: "Does the vendor allow you to choose the geographic region where data is stored?",
      hint: "Check regional availability and data residency options."
    },
    {
      id: "va_17",
      category: "Decommissioning",
      text: "Does the vendor provide a certificate of data destruction upon contract termination?",
      hint: "Review the exit/termination clause in the contract."
    },
    {
      id: "va_18",
      category: "Monitoring",
      text: "Does the vendor provide a real-time status page or uptime monitoring dashboard?",
      hint: "Check for status.vendor.com."
    },
    {
      id: "va_19",
      category: "Patch Management",
      text: "Does the vendor have a formal policy for patching zero-day vulnerabilities?",
      hint: "Review the vendor's vulnerability disclosure policy."
    },
    {
      id: "va_20",
      category: "Identity Management",
      text: "Does the vendor support Single Sign-On (SSO) via SAML or OIDC?",
      hint: "Verify integration capabilities."
    },
    {
      id: "va_21",
      category: "Compliance",
      text: "Is the vendor compliant with regional laws like CCPA, GDPR, or LGPD?",
      hint: "Check the vendor's privacy center."
    },
    {
      id: "va_22",
      category: "Network Security",
      text: "Does the vendor utilize Web Application Firewalls (WAF) and DDoS protection?",
      hint: "Review vendor's edge security layers."
    }
  ]
};
