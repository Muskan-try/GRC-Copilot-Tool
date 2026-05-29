const mongoose = require('mongoose');
const logger = require('./logger');

async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grc_copilot', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.error('MongoDB connection failed:', err);
    throw err;
  }
}

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

// ─── LEGACY Question Schema (kept for backward compatibility) ───────────────
const QuestionSchema = new mongoose.Schema({
  question_id: { type: String, required: true, unique: true },
  framework: { type: String, required: true, index: true },
  category: { type: String, required: true },
  text: { type: String, required: true },
  hint: String,
  options: [String],
  depth_levels: {
    type: [String],
    enum: ['quick', 'normal', 'intermediate', 'deep'],
    default: ['quick', 'normal', 'intermediate', 'deep'],
  },
  control_ids: [String],
  weight: { type: Number, default: 1.0 },
  created_at: { type: Date, default: Date.now },
});

QuestionSchema.index({ framework: 1, category: 1 });
QuestionSchema.index({ framework: 1, depth_levels: 1 });

// ─── NEW: QuestionBank Schema (authoritative master question bank) ──────────
const QuestionBankSchema = new mongoose.Schema({
  question_id: { type: String, required: true, unique: true, index: true },
  framework: { type: String, required: true, index: true },
  version: { type: String, default: '' },
  domain: { type: String, required: true, index: true },
  control_ref: { type: String, required: true },
  text: { type: String, required: true },
  hint: { type: String, default: '' },
  response_options: {
    type: [String],
    default: ['Yes', 'Partial', 'No', 'NA'],
  },
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

// ─── NEW: AssessmentQuestionnaire Schema (per-assessment snapshot) ──────────
const AssessmentQuestionnaireSchema = new mongoose.Schema({
  assessment_id: { type: String, required: true, index: true },
  org_id: { type: String, index: true },
  user_id: { type: String, index: true },
  assessment_type: {
    type: String,
    enum: ['risk_assessment', 'gap_assessment', 'vendor_assessment', 'internal_audit', 'compliance_assessment'],
    default: 'compliance_assessment',
  },
  analysis_depth: {
    type: String,
    enum: ['quick', 'standard', 'comprehensive', 'full'],
    default: 'standard',
  },
  frameworks: [String],
  questions: [{
    question_id: String,
    framework: String,
    domain: String,
    control_ref: String,
    text: String,
    hint: String,
    response_options: [String],
    has_maturity_scale: Boolean,
    evidence_required: [String],
    weight: Number,
    critical: Boolean,
    depth_level: String,
    sequence_index: Number,
  }],
  total_questions: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

AssessmentQuestionnaireSchema.index({ assessment_id: 1, status: 1 });

// ─── NEW: AssessmentResponse Schema (canonical response store) ──────────────
const AssessmentResponseSchema = new mongoose.Schema({
  assessment_id: { type: String, required: true, index: true },
  user_id: { type: String, index: true },
  question_id: { type: String, required: true, index: true },
  answer_index: { type: Number, min: 0, max: 3 }, // 0=Yes, 1=Partial, 2=No, 3=NA
  answer_text: { type: String, default: '' },
  maturity_score: { type: Number, min: 0, max: 5, default: 0 },
  domain: { type: String, default: '' },
  control: { type: String, default: '' },
  weight: { type: Number, default: 1.0 },
  critical: { type: Boolean, default: false },
  is_na: { type: Boolean, default: false },
  evidence_count: { type: Number, default: 0 },
  submitted_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

AssessmentResponseSchema.index({ assessment_id: 1, question_id: 1 }, { unique: true });
AssessmentResponseSchema.index({ assessment_id: 1, domain: 1 });
AssessmentResponseSchema.index({ assessment_id: 1, submitted_at: -1 });

// ─── NEW: EvidenceFile Schema (evidence metadata in MongoDB) ────────────────
const EvidenceFileSchema = new mongoose.Schema({
  assessment_id: { type: String, required: true, index: true },
  response_id: { type: String, index: true },
  question_id: { type: String, required: true, index: true },
  user_id: { type: String, index: true },
  original_name: { type: String, required: true },
  stored_name: { type: String, required: true },
  file_path: { type: String, required: true },
  file_size: { type: Number, default: 0 },
  mime_type: { type: String, default: '' },
  uploaded_at: { type: Date, default: Date.now },
});

EvidenceFileSchema.index({ assessment_id: 1, question_id: 1 });
EvidenceFileSchema.index({ assessment_id: 1, uploaded_at: -1 });

// ─── Report Schema (unchanged) ──────────────────────────────────────────────
const ReportSchema = new mongoose.Schema({
  report_id: { type: String, required: true, unique: true },
  assessment_id: { type: String, required: true },
  org_id: String,
  framework: String,
  compliance_score: Number,
  risk_level: String,

  executive_summary: String,

  risk_analysis: {
    overall_score: Number,
    risk_level: String,
    risks: [{
      id: String,
      title: String,
      category: String,
      likelihood: Number,
      impact: Number,
      severity: String,
      mitigation: String,
      user_priority: String,
    }],
    distribution: {
      critical: Number,
      high: Number,
      medium: Number,
      low: Number,
    },
  },

  gap_analysis: [{
    control_id: String,
    control_name: String,
    domain: String,
    current_state: String,
    required_state: String,
    gap_severity: String,
    question_ref: String,
  }],

  controls_mapping: [{
    control_id: String,
    control_name: String,
    domain: String,
    status: { type: String, enum: ['implemented', 'partial', 'missing'] },
    evidence_count: Number,
  }],

  recommendations: [{
    title: String,
    detail: String,
    horizon: { type: String, enum: ['short', 'mid', 'long'] },
    priority: String,
    base_cost_usd: Number,
    cost_inr: Number,
    effort: String,
  }],

  cost_summary: {
    total_usd: Number,
    critical_usd: Number,
    total_inr: Number,
    critical_inr: Number,
    breakdown: mongoose.Schema.Types.Mixed,
    items: [{
      label: String,
      category: String,
      base_cost_usd: Number,
      cost_inr: Number,
      timeline: String,
    }],
  },

  domain_scores: [{
    domain: String,
    score: Number,
    questions_total: Number,
    questions_answered: Number,
  }],

  pdf_url: String,
  docx_url: String,
  status: { type: String, enum: ['generating', 'complete', 'failed'], default: 'generating' },
  error_message: String,
  evidence_count: { type: Number, default: 0 },
  generated_at: { type: Date, default: Date.now },
});

ReportSchema.index({ assessment_id: 1 });
ReportSchema.index({ generated_at: -1 });

// ─── Models ─────────────────────────────────────────────────────────────────
const Question = mongoose.model('Question', QuestionSchema);
const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);
const AssessmentQuestionnaire = mongoose.model('AssessmentQuestionnaire', AssessmentQuestionnaireSchema);
const AssessmentResponse = mongoose.model('AssessmentResponse', AssessmentResponseSchema);
const EvidenceFile = mongoose.model('EvidenceFile', EvidenceFileSchema);
const Report = mongoose.model('Report', ReportSchema);

module.exports = {
  connectMongo,
  Question,
  QuestionBank,
  AssessmentQuestionnaire,
  AssessmentResponse,
  EvidenceFile,
  Report,
};
