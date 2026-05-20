const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../../../middleware/auth');
const assessmentService = require('../services/assessment.service');
const evidenceService = require('../services/evidence.service');
const gapAnalysisService = require('../services/gap_analysis.service');
const insuranceService = require('../../insurance/services/insurance.service');
const dashboardService = require('../services/dashboard.service');
const router = express.Router();

// ─── Multer Config for Secure File Handling ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || './uploads', req.params.id || 'misc');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.log', '.txt', '.docx', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not supported`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

// ─── Assessment Routes ───────────────────────────────────────────────────

/**
 * POST /api/v2/assessment/create
 * Initialize a new assessment.
 */
router.post(
  '/create',
  authenticate,
  [
    body('organization_name').trim().notEmpty().withMessage('organization_name is required'),
    body('selected_frameworks').isArray({ min: 1 }).withMessage('selected_frameworks must be an array with at least one framework'),
    body('scope').optional().isObject().withMessage('scope must be an object'),
    body('analysis_depth').optional().isString().withMessage('analysis_depth must be a string'),
    body('assessment_type').optional().isString().withMessage('assessment_type must be a string'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { organization_name, selected_frameworks, scope = {}, analysis_depth = 'quick', assessment_type = 'compliance_assessment' } = req.body;

      const result = await assessmentService.createAssessment(
        organization_name,
        req.user.user_id,
        selected_frameworks,
        scope,
        analysis_depth,
        assessment_type
      );
      
      res.status(201).json(result);
    } catch (err) {
      if (err.message.includes('None of the selected frameworks')) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/v2/assessment/:id/config
 * Update assessment configuration (type, depth, status).
 */
router.patch('/:id/config', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { analysis_depth, assessment_type, status } = req.body;
    const updates = {};
    if (analysis_depth !== undefined) updates.analysis_depth = analysis_depth;
    if (assessment_type !== undefined) updates.assessment_type = assessment_type;
    if (status !== undefined) updates.status = status;

    const result = await assessmentService.updateAssessmentConfig(id, req.user.user_id, updates);
    res.json({ message: 'Assessment updated.', assessment: result });
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/v2/assessment/:id/complete
 * Mark assessment as complete.
 */
router.post('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await assessmentService.completeAssessment(id, req.user.user_id);
    if (!result) return res.status(404).json({ error: 'Assessment not found or already complete' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v2/assessment/:id
 * Return full assessment metadata.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await assessmentService.getAssessment(id, req.user.user_id);
    
    if (!result) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ─── Evidence Collection Routes ───────────────────────────────────────────

/**
 * POST /api/v2/assessment/:id/evidence
 * Upload evidence files and link to a question.
 */
router.post(
  '/:id/evidence',
  authenticate,
  (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { question_id } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploaded = [];
      for (const file of req.files) {
        const entry = await evidenceService.addEvidence(id, req.user.user_id, file, question_id);
        uploaded.push(entry);
      }

      res.status(201).json({
        assessment_id: id,
        question_id,
        files: uploaded
      });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * GET /api/v2/assessment/:id/evidence
 * Get all evidence for an assessment.
 */
router.get('/:id/evidence', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const evidence = await evidenceService.getEvidenceForAssessment(id, req.user.user_id);
    res.json({ evidence });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v2/assessment/:id/gaps
 * Identify control gaps and generate recommendations.
 */
router.get('/:id/gaps', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await gapAnalysisService.performAnalysis(id, req.user.user_id);
    res.json(result);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/v2/assessment/:id/insurance-score
 * Calculate cyber insurance readiness score.
 */
router.get('/:id/insurance-score', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await insuranceService.calculateReadiness(id, req.user.user_id);
    res.json(result);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/v2/assessment/:id/dashboard
 * Get comprehensive dashboard data for visualization.
 */
router.get('/:id/dashboard', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dashboardService.getDashboardData(id, req.user.user_id);
    res.json(result);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// Existing scaffolding
router.get('/:id/status', authenticate, async (req, res, next) => {
  try {
    const result = await assessmentService.getAssessmentProgress(req.params.id);
    if (!result) return res.status(404).json({ error: 'Assessment not found.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v2/assessment/:id/frameworks
 * Add additional frameworks to an existing assessment.
 */
router.post(
  '/:id/frameworks',
  authenticate,
  [
    body('frameworks').isArray({ min: 1 }).withMessage('frameworks must be an array with at least one framework'),
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { frameworks } = req.body;
      const result = await assessmentService.addFrameworks(id, req.user.user_id, frameworks);
      res.json(result);
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

module.exports = router;
