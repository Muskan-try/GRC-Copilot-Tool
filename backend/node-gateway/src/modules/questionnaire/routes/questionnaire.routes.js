const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const questionnaireService = require('../services/questionnaire.service');
const router = express.Router();

/**
 * GET /api/v2/questionnaire/assessment/:id/questions
 * Dynamically generate and group questions for the selected frameworks.
 */
router.get('/assessment/:id/questions', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const questions = await questionnaireService.getQuestionsForAssessment(id, req.user.user_id);
    res.json({ questions });
  } catch (err) {
    if (err.message.includes('No frameworks linked')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * GET /api/v2/questionnaire/framework/:name/questions
 * Get all questions for a specific framework by its name.
 */
router.get('/framework/:name/questions', authenticate, async (req, res, next) => {
  try {
    const { name } = req.params;
    const questions = await questionnaireService.getQuestionsByFrameworkName(name);
    res.json({ questions });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v2/questionnaire/assessment/:id/response
 * Store assessment response with dual-write (MongoDB + PostgreSQL).
 */
router.post(
  '/assessment/:id/response',
  authenticate,
  [
    body('question_id').notEmpty().withMessage('question_id is required'),
    body('answer_index').optional().isInt({ min: 0, max: 3 }),
    body('maturity_score').optional().isInt({ min: 0, max: 5 }),
    body('answer_text').optional().trim(),
    body('domain').optional().trim(),
    body('control').optional().trim(),
    body('weight').optional().isFloat(),
    body('critical').optional().isBoolean(),
    body('is_na').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const result = await questionnaireService.saveResponse(
        id,
        req.user.user_id,
        req.body.question_id,
        req.body
      );

      res.json(result);
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('unauthorized')) {
        return res.status(404).json({ error: err.message });
      }
      next(err);
    }
  }
);

/**
 * GET /api/v2/questionnaire/assessment/:id/stats
 * Get response stats for dashboard activity feed.
 */
router.get('/assessment/:id/stats', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await questionnaireService.getResponseStats(id);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
