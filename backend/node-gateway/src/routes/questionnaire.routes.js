const express = require('express');
const { query } = require('../config/postgres');
const { Question, QuestionBank } = require('../config/mongo');
const { authenticate } = require('../middleware/auth');
const QUESTION_BANK = require('../data/questionBank');
const { generateQuestions, generateReport } = require('../services/ai.service');
const logger = require('../config/logger');

const router = express.Router();

// Map frontend framework IDs to backend question bank keys
const FRAMEWORK_MAP = {
  "GDPR": "GDPR",
  "DPDPA": "DPDP Act",
  "DPDPA (India)": "DPDP Act",
  "CCPA": "CCPA",
  "CCPA/CPRA": "CCPA",
  "HIPAA": "HIPAA",
  "HIPAA Security Rule": "HIPAA",
  "ISO/IEC 27001": "ISO/IEC 27001",
  "ISO/IEC 27001:2022": "ISO/IEC 27001",
  "ISO/IEC 27002": "ISO/IEC 27002",
  "ISO/IEC 27701": "ISO/IEC 27701",
  "PCI DSS": "PCI DSS",
  "PCI DSS v4.0": "PCI DSS",
  "SOC 2": "SOC 2",
  "SOC 2 Trust Services Criteria": "SOC 2",
  "FedRAMP": "FedRAMP",
  "NIST CSF": "NIST CSF",
  "NIST CSF 2.0": "NIST CSF",
  "CIS Controls": "CIS Controls",
  "CIS Controls v8": "CIS Controls",
  "COBIT": "COBIT",
  "ISO/IEC 27017": "ISO/IEC 27017",
  "ISO/IEC 27018": "ISO/IEC 27018",
  "CSA CCM": "CSA CCM",
  "ISO 31000": "ISO 31000",
  "NIST RMF": "NIST RMF",
};

// Questions per depth level
const DEPTH_QUESTION_COUNTS = { 
  quick: 30, 
  standard: 60,
  comprehensive: 200,
  full: 500, 
  internal: 100, 
  vendor: 100, 
  risk: 100, 
  gap: 100 
};

// Seed question bank to MongoDB on startup
async function seedQuestions() {
  try {
    logger.info('Starting question bank sync from JS data...');
    let seededCount = 0;
    let qbCount = 0;

    for (const [fw, categories] of Object.entries(QUESTION_BANK)) {
      for (const [cat, questions] of Object.entries(categories)) {
        for (const q of questions) {
          // v1 seeding (upsert)
          await Question.findOneAndUpdate(
            { question_id: q.id },
            {
              $set: {
                question_id: q.id,
                framework: fw,
                category: cat,
                text: q.text,
                hint: q.hint,
                options: q.opts,
                depth_levels: q.depth,
                control_ids: q.controls,
                weight: q.weight || 1.0,
              }
            },
            { upsert: true }
          );
          seededCount++;

          // v2 seeding (upsert)
          const v2Depths = (q.depth || []).map(d => {
            if (d === 'intermediate') return 'standard';
            if (d === 'deep') return 'comprehensive';
            return d;
          });

          await QuestionBank.findOneAndUpdate(
            { question_id: q.id },
            {
              $set: {
                question_id: q.id,
                framework: fw,
                domain: cat,
                control_ref: q.controls && q.controls.length > 0 ? q.controls[0] : q.id,
                text: q.text,
                hint: q.hint || '',
                response_options: q.opts || ['Yes', 'Partial', 'No', 'NA'],
                has_maturity_scale: true,
                assessment_types: ['compliance_assessment', 'risk_assessment', 'gap_assessment', 'vendor_assessment', 'internal_audit'],
                depth_levels: v2Depths.length > 0 ? v2Depths : ['quick', 'standard', 'comprehensive'],
                weight: q.weight || 1.0,
                critical: (q.weight || 1.0) > 1.3,
                is_active: true,
                updated_at: new Date(),
              }
            },
            { upsert: true }
          );
          qbCount++;
        }
      }
    }
    logger.info(`Question bank sync complete: ${seededCount} v1 questions, ${qbCount} v2 QuestionBank entries.`);
  } catch (err) {
    logger.error('Question seeding error:', err);
  }
}

// Run seeding on module load
setTimeout(seedQuestions, 3000);

// Map frontend depth names to backend depth tags
const DEPTH_MAP = {
  'standard': 'intermediate',
  'comprehensive': 'deep',
  'full': 'deep'
};

// GET /api/questionnaire/generate
router.get('/generate', authenticate, async (req, res, next) => {
  try {
    const { assessment_id } = req.query;
    if (!assessment_id) {
      return res.status(400).json({ error: 'assessment_id query parameter required.' });
    }

    // Fetch assessment + organization context
    const assessResult = await query(
      `SELECT a.*, o.industry, o.employee_range, o.frameworks, o.name AS org_name
       FROM assessments a
       JOIN organizations o ON o.id = a.org_id
       WHERE a.id = $1 
         AND (
           a.user_id = $2
           OR (SELECT role FROM users WHERE id = $2) = 'admin'
           OR a.org_id IN (SELECT org_id FROM org_members WHERE user_id = $2 AND status = 'active')
         )`,
      [assessment_id, req.user.user_id]
    );

    if (!assessResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const assessment = assessResult.rows[0];
    const frameworkFrontend = assessment.framework;
    const frameworkBackend = FRAMEWORK_MAP[frameworkFrontend] || frameworkFrontend;
    const depth = assessment.analysis_depth;
    
    // Map depth for query (e.g., 'standard' -> 'intermediate')
    const queryDepth = DEPTH_MAP[depth] || depth;
    const maxQuestions = DEPTH_QUESTION_COUNTS[depth] || 15;

    logger.info(`Generating questionnaire for ${frameworkBackend} at ${depth} depth (querying for ${queryDepth}, max ${maxQuestions})`);

    // Get questions from MongoDB filtered by framework and depth
    const questions = await Question.find({
      framework: frameworkBackend,
      depth_levels: queryDepth,
    }).sort({ weight: -1 }).limit(maxQuestions);

    // If MongoDB is empty, fall back to in-memory question bank
    let questionList = questions;
    if (questions.length === 0 && QUESTION_BANK[frameworkBackend]) {
      const bank = QUESTION_BANK[frameworkBackend];
      const allQ = [];
      for (const [cat, qs] of Object.entries(bank)) {
        for (const q of qs) {
          if (q.depth.includes(queryDepth) || q.depth.includes('quick')) {
            allQ.push({ ...q, category: cat });
          }
        }
      }
      allQ.sort((a, b) => b.weight - a.weight);
      questionList = allQ.slice(0, maxQuestions).map(q => ({
        question_id: q.id,
        framework: frameworkBackend,
        category: q.category,
        text: q.text,
        hint: q.hint,
        options: q.opts,
        depth_levels: q.depth,
        control_ids: q.controls,
        weight: q.weight,
      }));
    }

    // Update assessment total question count
    await query(
      'UPDATE assessments SET total_questions = $1, updated_at = NOW() WHERE id = $2',
      [questionList.length, assessment_id]
    );

    // Get already-submitted responses for this assessment
    const existingResponses = await query(
      'SELECT question_id, answer_index FROM responses WHERE assessment_id = $1',
      [assessment_id]
    );
    const answeredMap = {};
    existingResponses.rows.forEach(r => { answeredMap[r.question_id] = r.answer_index; });

    res.json({
      assessment_id,
      framework: frameworkFrontend,
      framework_backend: frameworkBackend,
      analysis_depth: depth,
      organization: assessment.org_name,
      industry: assessment.industry,
      total_questions: questionList.length,
      answered_count: existingResponses.rowCount,
      questions: questionList.map(q => ({
        id: q.question_id,
        category: q.category,
        text: q.text,
        hint: q.hint,
        options: q.options,
        control_ids: q.control_ids,
        existing_answer: answeredMap[q.question_id] ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/questionnaire/frameworks
router.get('/frameworks', authenticate, async (req, res) => {
  res.json({
    categories: {
      'Data Protection & Privacy': {
        description: 'Laws governing personal data collection, processing, and individual rights',
        frameworks: ['GDPR', 'DPDPA', 'CCPA', 'HIPAA'],
      },
      'Information Security Standards': {
        description: 'International standards for information security management systems',
        frameworks: ['ISO/IEC 27001', 'ISO/IEC 27002', 'ISO/IEC 27701'],
      },
      'Industry-Specific Compliance': {
        description: 'Sector-specific compliance requirements',
        frameworks: ['PCI DSS', 'SOC 2', 'FedRAMP'],
      },
      'Cybersecurity Frameworks': {
        description: 'Frameworks for managing and improving cybersecurity posture',
        frameworks: ['NIST CSF', 'CIS Controls', 'COBIT'],
      },
      'Cloud Security': {
        description: 'Cloud-specific security standards and controls',
        frameworks: ['ISO/IEC 27017', 'ISO/IEC 27018', 'CSA CCM'],
      },
      'Risk Management': {
        description: 'Risk management frameworks and standards',
        frameworks: ['ISO 31000', 'NIST RMF'],
      },
    },
    depth_options: {
      quick: { questions: 15, estimated_minutes: 10 },
      standard: { questions: 35, estimated_minutes: 30 },
      comprehensive: { questions: 60, estimated_minutes: 60 },
      full: { questions: 100, estimated_minutes: 120 },
      internal: { questions: 40, estimated_minutes: 45 },
      vendor: { questions: 40, estimated_minutes: 45 },
      risk: { questions: 40, estimated_minutes: 45 },
      gap: { questions: 40, estimated_minutes: 45 },
    },
  });
});

// POST /api/questionnaire/ai-generate
router.post('/ai-generate', authenticate, async (req, res, next) => {
  try {
    const { framework, categories, depth } = req.body;
    if (!framework || !categories) return res.status(400).json({ error: 'framework and categories required' });

    const countPerCat = Math.max(2, Math.floor((DEPTH_QUESTION_COUNTS[depth] || 6) / categories.length));
    logger.info(`AI generating questions for ${framework} (${depth})`);

    const aiResult = await generateQuestions(framework, categories, depth, countPerCat);
    if (!aiResult || !aiResult.sections) return res.status(500).json({ error: 'AI generation failed' });

    const questions = [];
    aiResult.sections.forEach((section) => {
      section.questions.forEach((q, i) => {
        questions.push({
          id: `${framework}-${section.section.toLowerCase().replace(/\s/g, '-')}-${i}`,
          category: section.section, text: q.text, hint: q.hint || '',
          options: q.options || ['Yes', 'Partial', 'No', 'N/A'],
          control_ids: [], existing_answer: null, ai_generated: true,
        });
      });
    });

    res.json({ framework, analysis_depth: depth, total_questions: questions.length, questions, ai_generated: true });
  } catch (err) { next(err); }
});

// POST /api/questionnaire/ai-report
router.post('/ai-report', authenticate, async (req, res, next) => {
  try {
    const { framework, score, risk, gaps, answers } = req.body;
    logger.info(`AI generating report for ${framework}: ${score}%, ${risk}`);
    const aiReport = await generateReport(framework, score, risk, gaps || [], answers || {});
    if (!aiReport) return res.status(500).json({ error: 'AI report generation failed' });
    res.json(aiReport);
  } catch (err) { next(err); }
});

module.exports = router;
