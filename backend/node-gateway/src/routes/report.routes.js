const express = require('express');
const { query, verifyReportOwnership, verifyAssessmentOwnership } = require('../config/postgres');
const { Report } = require('../config/mongo');
const { authenticate } = require('../middleware/auth');
const audit = require('../services/audit.service');

const router = express.Router();

// GET /api/reports/:reportId
router.get('/:reportId', authenticate, async (req, res, next) => {
  try {
    const { reportId } = req.params;

    // Verify ownership via assessment
    await verifyReportOwnership(reportId, req.user.org_id);

    const report = await Report.findOne({ report_id: reportId });
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    res.json(report.toObject());
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/:reportId/sections/:section
router.get('/:reportId/sections/:section', authenticate, async (req, res, next) => {
  try {
    const { reportId, section } = req.params;
    const validSections = ['executive_summary', 'risk_analysis', 'gap_analysis', 'controls_mapping', 'recommendations', 'cost_summary'];

    if (!validSections.includes(section)) {
      return res.status(400).json({ error: `Invalid section. Valid: ${validSections.join(', ')}` });
    }

    // Verify ownership
    await verifyReportOwnership(reportId, req.user.org_id);

    const report = await Report.findOne({ report_id: reportId }, { [section]: 1, compliance_score: 1, risk_level: 1 });
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    res.json({
      report_id: reportId,
      section,
      data: report[section],
      compliance_score: report.compliance_score,
      risk_level: report.risk_level,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/assessment/:assessmentId
router.get('/assessment/:assessmentId', authenticate, async (req, res, next) => {
  try {
    const { assessmentId } = req.params;

    // Verify ownership
    await verifyAssessmentOwnership(assessmentId, req.user.org_id);

    const assessResult = await query(
      'SELECT id, framework, status FROM assessments WHERE id = $1 AND org_id = $2',
      [assessmentId, req.user.org_id]
    );
    if (!assessResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const report = await Report.findOne({ assessment_id: assessmentId });
    if (!report) {
      return res.status(404).json({ error: 'Report not found for this assessment.' });
    }

    res.json(report.toObject());
  } catch (err) {
    next(err);
  }
});

const REGION_MULTIPLIERS = {
  'India': 0.6,
  'US': 1.5,
  'USA': 1.5,
  'EU': 1.3,
  'Europe': 1.3,
  'APAC': 0.9,
  'Asia': 0.9,
  'Other': 1.0
};

const EXCHANGE_RATES = {
  'USD': 1.0,
  'INR': 90.0,
  'EUR': 0.93,
  'GBP': 0.80,
  'AED': 3.67,
  'SGD': 1.35,
  'BDT': 115.0,
  'PKR': 280.0,
  'LKR': 300.0,
  'AUD': 1.52,
  'JPY': 150.0
};

// GET /api/reports/assessment/:assessmentId/cost
router.get('/assessment/:assessmentId/cost', authenticate, async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const currency = req.query.currency || 'USD';

    // 1. Get assessment and organization to find region
    await verifyAssessmentOwnership(assessmentId, req.user.org_id);
    const assessResult = await query(
      `SELECT a.id, o.region 
       FROM assessments a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.id = $1 AND a.org_id = $2`,
      [assessmentId, req.user.org_id]
    );

    if (!assessResult.rows.length) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    const region = assessResult.rows[0].region || 'Other';
    const multiplier = REGION_MULTIPLIERS[region] || REGION_MULTIPLIERS['Other'];
    const exchangeRate = EXCHANGE_RATES[currency] || 1.0;

    // 2. Get report for base costs
    const report = await Report.findOne({ assessment_id: assessmentId }, { cost_summary: 1 });
    if (!report || !report.cost_summary) {
      return res.status(404).json({ error: 'Report or cost data not found.' });
    }

    const baseCostUsd = report.cost_summary.total_usd || (report.cost_summary.total_inr / 83.5) || 0;
    const criticalBaseUsd = report.cost_summary.critical_usd || (report.cost_summary.critical_inr / 83.5) || 0;

    const convertedCost = baseCostUsd * multiplier * exchangeRate;
    const convertedCritical = criticalBaseUsd * multiplier * exchangeRate;

    const symbols = {
      'INR': '₹', 'EUR': '€', 'GBP': '£', 'AED': 'AED ', 
      'BDT': '৳', 'PKR': '₨', 'LKR': '₨', 'SGD': 'S$', 'USD': '$'
    };

    res.json({
      assessment_id: assessmentId,
      base_cost_usd: baseCostUsd,
      region,
      multiplier,
      currency,
      exchange_rate: exchangeRate,
      converted_cost: Math.round(convertedCost * 100) / 100,
      converted_critical_cost: Math.round(convertedCritical * 100) / 100,
      symbol: symbols[currency] || '$'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
