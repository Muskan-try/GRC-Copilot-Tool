const express = require('express');
const { authenticate } = require('../../../middleware/auth');
const reportingService = require('../services/reporting.service');
const audit = require('../../../services/audit.service');
const router = express.Router();

/**
 * GET /api/v2/reporting/assessment/:id
 * Generate a complete CISO-ready compliance and risk report.
 * Supports ?format=json or ?format=pdf
 */
router.get('/assessment/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const reportData = await reportingService.generateReportData(id, req.user.user_id);

    if (format === 'pdf') {
      // PDF Generation Placeholder: In a real implementation, this would trigger 
      // the FastAPI pdf_generator and return the binary or a URL.
      return res.status(501).json({ 
        message: 'PDF generation for modular reports is being initialized.',
        report_data: reportData 
      });
    }

    res.json(reportData);
  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('unauthorized')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// Existing scaffolding
router.post('/:assessment_id/generate', authenticate, async (req, res, next) => {
  try {
    const result = await reportingService.generateFullReport(req.params.assessment_id);
    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.REPORT_VIEW, 'report', id, { format }, req).catch(() => {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
