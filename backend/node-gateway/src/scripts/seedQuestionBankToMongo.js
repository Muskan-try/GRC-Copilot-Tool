/**
 * Seed QuestionBank to MongoDB
 * Reads compliance_questionnaires.json and upserts into question_banks collection.
 *
 * Usage:
 *   cd backend/node-gateway
 *   node src/scripts/seedQuestionBankToMongo.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('../config/logger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/grc_copilot';

// Define inline schema to avoid circular deps
const QuestionBankSchema = new mongoose.Schema({
  question_id: { type: String, required: true, unique: true, index: true },
  framework: { type: String, required: true, index: true },
  version: { type: String, default: '' },
  domain: { type: String, required: true, index: true },
  control_ref: { type: String, required: true },
  text: { type: String, required: true },
  hint: { type: String, default: '' },
  response_options: { type: [String], default: ['Yes', 'Partial', 'No', 'NA'] },
  has_maturity_scale: { type: Boolean, default: true },
  evidence_required: { type: [String], default: [] },
  assessment_types: {
    type: [String],
    enum: ['risk_assessment', 'gap_assessment', 'vendor_assessment', 'internal_audit', 'compliance_assessment'],
    default: ['compliance_assessment'],
  },
  depth_levels: {
    type: [String],
    enum: ['quick', 'standard', 'comprehensive'],
    default: ['quick', 'standard', 'comprehensive'],
  },
  weight: { type: Number, default: 1.0 },
  critical: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

QuestionBankSchema.index({ framework: 1, domain: 1 });
QuestionBankSchema.index({ framework: 1, depth_levels: 1 });
QuestionBankSchema.index({ assessment_types: 1 });
QuestionBankSchema.index({ is_active: 1 });

const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);

// Framework config for metadata
const FRAMEWORK_CONFIG = {
  ISO_27001_2022: { name: 'ISO/IEC 27001:2022', version: '2022', critical_domains: ['Organizational Controls', 'Technological Controls'] },
  SOC_2: { name: 'SOC 2 Trust Services Criteria', version: '2017', critical_domains: ['Security (Common Criteria)', 'Privacy'] },
  GDPR: { name: 'GDPR', version: '2016/679', critical_domains: ['Lawful Basis & Consent', 'Data Subject Rights', 'Breach Notification'] },
  NIST_CSF_2_0: { name: 'NIST CSF 2.0', version: '2.0', critical_domains: ['GOVERN', 'PROTECT', 'RESPOND'] },
  PCI_DSS_v4_0: { name: 'PCI DSS v4.0', version: '4.0', critical_domains: ['Secure Network', 'Protect Account Data', 'Access Control'] },
  HIPAA_Security_Rule: { name: 'HIPAA Security Rule', version: '2013', critical_domains: ['Administrative Safeguards', 'Technical Safeguards'] },
  DPDPA_India: { name: 'DPDPA (India)', version: '2023', critical_domains: ['Consent & Notice', 'Data Principal Rights', 'Security & Breach'] },
  CCPA_CPRA: { name: 'CCPA/CPRA', version: '2020', critical_domains: ['Consumer Rights', 'Sale Opt-Out', 'Security'] },
  CIS_Controls_v8: { name: 'CIS Controls v8', version: '8', critical_domains: ['Inventory and Control of Enterprise Assets', 'Data Protection', 'Access Control Management'] },
};

// Vendor-relevant domains (for vendor_assessment filtering)
const VENDOR_RELEVANT_DOMAINS = [
  'Organizational Controls', 'People Controls', 'Technological Controls',
  'Security (Common Criteria)', 'Privacy', 'Confidentiality',
  'Lawful Basis & Consent', 'Data Subject Rights', 'Breach Notification',
  'GOVERN', 'IDENTIFY', 'PROTECT', 'RESPOND',
  'Secure Network', 'Protect Account Data', 'Access Control', 'Monitoring & Testing',
  'Administrative Safeguards', 'Technical Safeguards',
  'Consent & Notice', 'Data Principal Rights', 'Security & Breach', 'Cross-Border & Processing',
  'Consumer Rights', 'Sale Opt-Out', 'Service Providers', 'Security',
  'Inventory and Control of Enterprise Assets', 'Data Protection', 'Access Control Management',
  'Vendor Management', 'Third-Party Risk'
];

function determineAssessmentTypes(domain, frameworkKey) {
  const types = ['compliance_assessment', 'gap_assessment', 'internal_audit', 'risk_assessment'];
  // Vendor assessment includes vendor-relevant domains
  if (VENDOR_RELEVANT_DOMAINS.some(d => domain.toLowerCase().includes(d.toLowerCase()))) {
    types.push('vendor_assessment');
  }
  return types;
}

/**
 * Distribute questions across depth levels globally per framework.
 * Targets: quick=10-15, standard=25-30, comprehensive=40+ (all remaining).
 * Critical domain questions are prioritized for quick/standard.
 */
function distributeDepthLevels(questions, frameworkKey) {
  const config = FRAMEWORK_CONFIG[frameworkKey] || { critical_domains: [] };
  const total = questions.length;

  // Calculate target counts per framework
  const quickTarget = Math.min(15, Math.max(10, Math.round(total * 0.2)));
  const standardTarget = Math.min(30, Math.max(25, Math.round(total * 0.55)));

  // Sort by priority: critical domain first, then by original index for determinism
  const sorted = questions.map((q, idx) => ({ ...q, originalIndex: idx })).sort((a, b) => {
    const aCritical = config.critical_domains.some(cd =>
      (a.domain || 'General').toLowerCase().includes(cd.toLowerCase())) ? 1 : 0;
    const bCritical = config.critical_domains.some(cd =>
      (b.domain || 'General').toLowerCase().includes(cd.toLowerCase())) ? 1 : 0;
    if (bCritical !== aCritical) return bCritical - aCritical;
    return a.originalIndex - b.originalIndex;
  });

  const assigned = new Map();
  sorted.forEach((q, idx) => {
    const qid = `${frameworkKey.toLowerCase()}-${q.id}`.replace(/_/g, '-');
    if (idx < quickTarget) {
      assigned.set(qid, ['quick', 'standard', 'comprehensive']);
    } else if (idx < standardTarget) {
      assigned.set(qid, ['standard', 'comprehensive']);
    } else {
      assigned.set(qid, ['comprehensive']);
    }
  });

  return assigned;
}

function determineWeight(critical, domain, frameworkKey) {
  let weight = 1.0;
  if (critical) weight += 0.5;
  // PCI DSS and HIPAA controls are higher weight
  if (frameworkKey === 'PCI_DSS_v4_0' || frameworkKey === 'HIPAA_Security_Rule') weight += 0.3;
  return Math.min(weight, 2.0);
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB for seeding');

    const jsonPath = path.join(__dirname, '../../../../compliance_questionnaires.json');
    if (!fs.existsSync(jsonPath)) {
      logger.error('compliance_questionnaires.json not found at:', jsonPath);
      process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const frameworks = raw.compliance_frameworks;

    let totalInserted = 0;
    let totalUpdated = 0;

    for (const [key, fwData] of Object.entries(frameworks)) {
      const config = FRAMEWORK_CONFIG[key] || { name: key, version: '', critical_domains: [] };
      const questions = fwData.questions || [];
      logger.info(`Processing ${config.name} — ${questions.length} questions`);

      // Distribute depth levels globally per framework
      const depthMap = distributeDepthLevels(questions, key);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const domain = q.domain || 'General';
        const isCritical = config.critical_domains.some(cd => domain.toLowerCase().includes(cd.toLowerCase()));
        const qid = `${key.toLowerCase()}-${q.id}`.replace(/_/g, '-');

        const doc = {
          question_id: qid,
          framework: config.name,
          version: config.version,
          domain: domain,
          control_ref: q.control_ref || q.id,
          text: q.question,
          hint: q.hint || `Review ${q.control_ref || q.id} control requirements and evidence.`,
          response_options: q.response_options || ['Yes', 'Partial', 'No', 'NA'],
          has_maturity_scale: true,
          evidence_required: q.evidence_required || [],
          assessment_types: determineAssessmentTypes(domain, key),
          depth_levels: depthMap.get(qid) || ['comprehensive'],
          weight: determineWeight(isCritical, domain, key),
          critical: isCritical,
          is_active: true,
          updated_at: new Date(),
        };

        const result = await QuestionBank.findOneAndUpdate(
          { question_id: doc.question_id },
          { $set: doc, $setOnInsert: { created_at: new Date() } },
          { upsert: true, new: true }
        );

        if (result.createdAt && result.createdAt.getTime() === doc.updated_at.getTime()) {
          totalInserted++;
        } else {
          totalUpdated++;
        }
      }
    }

    logger.info(`Seed complete: ${totalInserted} inserted, ${totalUpdated} updated`);
    process.exit(0);
  } catch (err) {
    logger.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
