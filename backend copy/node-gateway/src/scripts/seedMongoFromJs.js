/**
 * Seed QuestionBank to MongoDB from JS file
 * Reads src/data/questionBank.js and upserts into question_banks collection.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QUESTION_BANK = require('../data/questionBank');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/grc_copilot';

// Define schema
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

const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    let totalInserted = 0;
    let totalUpdated = 0;

    for (const [framework, categories] of Object.entries(QUESTION_BANK)) {
      console.log(`Processing framework: ${framework}`);
      for (const [domain, questions] of Object.entries(categories)) {
        for (const q of questions) {
          const doc = {
            question_id: q.id,
            framework: framework,
            domain: domain,
            control_ref: q.controls && q.controls.length > 0 ? q.controls[0] : q.id,
            text: q.text,
            hint: q.hint || '',
            response_options: q.opts || ['Yes', 'Partial', 'No', 'NA'],
            has_maturity_scale: true,
            evidence_required: [],
            assessment_types: ['compliance_assessment'],
            depth_levels: q.depth || ['quick', 'standard', 'comprehensive'],
            weight: q.weight || 1.0,
            critical: false,
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
    }

    console.log(`Seed complete: ${totalInserted} inserted, ${totalUpdated} updated`);
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
