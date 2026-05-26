const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../../../middleware/auth');
const riskService = require('../services/risk.service');
const audit = require('../../../services/audit.service');
const router = express.Router();

/**
 * GET /api/v2/risk/assessment/:id
 * Get all identified risks for an assessment.
 */
router.get('/assessment/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const risks = await riskService.getRisksByAssessment(id, req.user.user_id);
    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.AUDIT_LOG_VIEW, 'risk', id, { count: risks?.length || 0 }, req).catch(() => {});
    res.json({ risks });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/v2/risk/:riskId/status
 * Update risk status and mitigation plan.
 */
router.patch(
  '/:riskId/status',
  authenticate,
  [
    body('status').isIn(['identified', 'mitigated', 'accepted', 'transferred']).withMessage('Invalid status'),
    body('mitigation_plan').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const { riskId } = req.params;
      const { status, mitigation_plan } = req.body;
      
      const result = await riskService.updateRiskStatus(riskId, req.user.user_id, status, mitigation_plan);
      
      if (!result) {
        return res.status(404).json({ error: 'Risk not found or unauthorized.' });
      }
      
      audit.log(req.user.user_id, audit.AUDIT_ACTIONS.RISK_UPDATE, 'risk', riskId, { status }, req).catch(() => {});
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
