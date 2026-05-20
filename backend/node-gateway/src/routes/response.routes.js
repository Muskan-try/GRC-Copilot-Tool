const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const { triggerAnalysis } = require('../services/analysis.service');
const logger = require('../config/logger');

const router = express.Router();

// ─── Multer file upload config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || './uploads', req.params.assessmentId || 'misc');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.xlsx', '.csv', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error(`File type ${ext} not allowed`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

// ─── POST /api/responses/submit ────────────────────────────────────────────
router.post(
  '/submit',
  authenticate,
  [
    body('assessment_id').notEmpty().isUUID().withMessage('Valid assessment_id required'),
    body('responses').isArray({ min: 1 }).withMessage('Responses array required'),
    body('responses.*.question_id').notEmpty().withMessage('question_id required per response'),
    body('responses.*.answer_index').isInt({ min: 0, max: 3 }).withMessage('answer_index must be 0-3'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { assessment_id, responses, is_final, risk_priorities } = req.body;

      // Verify assessment belongs to user
      const assessResult = await query(
        `SELECT id, status, org_id, framework, analysis_depth
         FROM assessments WHERE id = $1 AND user_id = $2`,
        [assessment_id, req.user.user_id]
      );

      if (!assessResult.rows.length) {
        return res.status(404).json({ error: 'Assessment not found.' });
      }

      const assessment = assessResult.rows[0];

      if (assessment.status === 'analyzing' || assessment.status === 'complete') {
        return res.status(409).json({ error: 'Assessment already submitted for analysis.' });
      }

      // Upsert each response
      let saved = 0;
      for (const resp of responses) {
        await query(
          `INSERT INTO responses (assessment_id, question_id, answer_index, category)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (assessment_id, question_id)
           DO UPDATE SET answer_index = EXCLUDED.answer_index, submitted_at = NOW()`,
          [assessment_id, resp.question_id, resp.answer_index, resp.category || null]
        );
        saved++;
      }

      // Update answered count
      const countResult = await query(
        'SELECT COUNT(*) FROM responses WHERE assessment_id = $1',
        [assessment_id]
      );
      await query(
        'UPDATE assessments SET answered_questions = $1, updated_at = NOW() WHERE id = $2',
        [parseInt(countResult.rows[0].count), assessment_id]
      );

      // Save risk priorities if provided
      if (risk_priorities && typeof risk_priorities === 'object') {
        for (const [risk_id, priority] of Object.entries(risk_priorities)) {
          if (priority) {
            await query(
              `INSERT INTO risk_priorities (assessment_id, risk_id, priority)
               VALUES ($1, $2, $3)
               ON CONFLICT (assessment_id, risk_id)
               DO UPDATE SET priority = EXCLUDED.priority, set_at = NOW()`,
              [assessment_id, risk_id, priority]
            );
          }
        }
      }

      let analysis_queued = false;
      let report_id = null;

      // Trigger analysis if this is the final submission
      if (is_final) {
        await query(
          'UPDATE assessments SET status = $1, updated_at = NOW() WHERE id = $2',
          ['analyzing', assessment_id]
        );

        // Trigger FastAPI analysis asynchronously
        triggerAnalysis(assessment_id, req.user.user_id).catch(err => {
          logger.error(`Analysis trigger failed for ${assessment_id}:`, err);
        });

        analysis_queued = true;
      }

      res.status(201).json({
        submission_id: uuidv4(),
        assessment_id,
        responses_saved: saved,
        is_final,
        analysis_queued,
        status: is_final ? 'analyzing' : 'in_progress',
        estimated_analysis_seconds: is_final ? 10 : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/responses/:assessmentId/evidence/:questionId ───────────────
router.post(
  '/:assessmentId/evidence/:questionId',
  authenticate,
  (req, res, next) => {
    upload.array('files', 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res, next) => {
    try {
      const { assessmentId, questionId } = req.params;

      // Verify ownership
      const assessResult = await query(
        'SELECT id FROM assessments WHERE id = $1 AND user_id = $2',
        [assessmentId, req.user.user_id]
      );
      if (!assessResult.rows.length) {
        return res.status(404).json({ error: 'Assessment not found.' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
      }

      // Get the response record for this question
      const responseResult = await query(
        'SELECT id FROM responses WHERE assessment_id = $1 AND question_id = $2',
        [assessmentId, questionId]
      );
      const response_id = responseResult.rows[0]?.id || null;

      const uploaded = [];
      for (const file of req.files) {
        const result = await query(
          `INSERT INTO evidence_files
             (response_id, assessment_id, question_id, original_name, stored_name, file_path, file_size, mime_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, original_name, file_size, uploaded_at`,
          [response_id, assessmentId, questionId, file.originalname, file.filename, file.path, file.size, file.mimetype]
        );
        uploaded.push(result.rows[0]);
      }

      res.status(201).json({
        assessment_id: assessmentId,
        question_id: questionId,
        uploaded_count: uploaded.length,
        files: uploaded.map(f => ({
          file_id: f.id,
          name: f.original_name,
          size_bytes: f.file_size,
          uploaded_at: f.uploaded_at,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/responses/:assessmentId ─────────────────────────────────────
router.get('/:assessmentId', authenticate, async (req, res, next) => {
  try {
    const { assessmentId } = req.params;

    const assessResult = await query(
      'SELECT id FROM assessments WHERE id = $1 AND user_id = $2',
      [assessmentId, req.user.user_id]
    );
    if (!assessResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const responses = await query(
      `SELECT r.question_id, r.answer_index, r.category, r.submitted_at,
              COALESCE(json_agg(ef.original_name) FILTER (WHERE ef.id IS NOT NULL), '[]') AS evidence_files
       FROM responses r
       LEFT JOIN evidence_files ef ON ef.response_id = r.id
       WHERE r.assessment_id = $1
       GROUP BY r.question_id, r.answer_index, r.category, r.submitted_at
       ORDER BY r.submitted_at`,
      [assessmentId]
    );

    res.json({
      assessment_id: assessmentId,
      total_responses: responses.rowCount,
      responses: responses.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/responses/:assessmentId/evidence/:fileId ─────────────────
router.delete('/:assessmentId/evidence/:fileId', authenticate, async (req, res, next) => {
  try {
    const { assessmentId, fileId } = req.params;

    const result = await query(
      `DELETE FROM evidence_files
       WHERE id = $1 AND assessment_id = $2
         AND assessment_id IN (SELECT id FROM assessments WHERE user_id = $3)
       RETURNING original_name, file_path`,
      [fileId, assessmentId, req.user.user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Optionally remove file from disk
    try {
      require('fs').unlinkSync(result.rows[0].file_path);
    } catch (_) {}

    res.json({ message: 'Evidence file deleted.', file: result.rows[0].original_name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
