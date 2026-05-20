const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

const VALID_FRAMEWORKS = [
  'ISO/IEC 27001:2022', 'SOC 2 Trust Services Criteria',
  'GDPR', 'NIST CSF 2.0', 'PCI DSS v4.0', 'HIPAA Security Rule',
  'DPDPA (India)', 'CCPA/CPRA', 'CIS Controls v8',
  'ISO 27001', 'ISO/IEC 27001', 'ISO/IEC 27002', 'ISO/IEC 27701', 'ISO/IEC 27017', 'ISO/IEC 27018',
  'NIST CSF', 'NIST SP 800-53', 'CIS Controls', 'COBIT',
  'DPDP Act', 'DPDPA', 'CCPA', 'PDPA',
  'HIPAA', 'PCI-DSS', 'PCI DSS', 'SOC 2', 'FedRAMP',
  'CSA CCM', 'ISO 31000', 'NIST RMF', 'RBI Guidelines',
];

const VALID_DEPTHS = ['full', 'internal', 'vendor', 'risk', 'gap', 'quick', 'standard', 'comprehensive'];
const VALID_INDUSTRIES = ['Technology', 'Healthcare', 'Finance & Banking', 'Manufacturing', 'Retail', 'Government', 'Education', 'Financial Services', 'Retail/E-commerce', 'Technology/Saas', 'Manufacturing', 'Government/Public Sector', 'Education', 'Energy/Utilities', 'Telecommunication', 'Other'];
const VALID_EMPLOYEE_RANGES = ['1-50', '51-150', '151-500', '500+', '51-200', '201-500', '501-2000', '2001-10000', '10000+', 'Small (1-50)', 'Medium (51-150)', 'Large (151-500)', 'Enterprise (500+)'];

// ─── POST /api/organization/setup ─────────────────────────────────────────
router.post(
  '/setup',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Organization name required'),
    body('frameworks').isArray({ min: 1 }).withMessage('At least one framework required'),
    body('analysis_depth').isIn(VALID_DEPTHS).withMessage('Invalid analysis depth'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

    const { name, industry, region, employee_range, contact_name, frameworks, analysis_depth, assessment_type } = req.body;

      // Upsert organization (update if exists for this user)
      const result = await query(
        `INSERT INTO organizations (user_id, name, industry, region, employee_range, contact_name, frameworks, analysis_depth)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [req.user.user_id, name, industry || null, region || null, employee_range || null, contact_name || null, frameworks, analysis_depth]
      );

      let org_id;
      if (result.rows.length) {
        org_id = result.rows[0].id;
      } else {
        // Update existing
        const updateResult = await query(
          `UPDATE organizations
           SET name=$1, industry=$2, region=$3, employee_range=$4,
               contact_name=$5, frameworks=$6, analysis_depth=$7, updated_at=NOW()
           WHERE user_id=$8
           RETURNING id`,
          [name, industry, region, employee_range, contact_name || null, frameworks, analysis_depth, req.user.user_id]
        );
        org_id = updateResult.rows[0].id;
      }

      // Create new assessment session
      const primaryFramework = frameworks[0];
      const assessType = assessment_type || 'compliance_assessment';
      const assessResult = await query(
        `INSERT INTO assessments (org_id, user_id, framework, analysis_depth, assessment_type, status)
         VALUES ($1, $2, $3, $4, $5, 'in_progress')
         RETURNING id, created_at`,
        [org_id, req.user.user_id, primaryFramework, analysis_depth, assessType]
      );

      const assessmentId = assessResult.rows[0].id;

      // Link frameworks to assessment
      for (const fwName of frameworks) {
        const fwResult = await query(
          'SELECT id FROM frameworks WHERE name = $1',
          [fwName]
        );
        if (fwResult.rows.length > 0) {
          await query(
            `INSERT INTO assessment_frameworks (assessment_id, framework_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [assessmentId, fwResult.rows[0].id]
          );
        }
      }

      logger.info(`Organization setup for user ${req.user.user_id}: ${name}`);
      res.status(201).json({
        org_id,
        id: assessmentId,
        assessment_id: assessmentId,
        framework: primaryFramework,
        all_frameworks: frameworks,
        analysis_depth,
        status: 'configured',
        created_at: assessResult.rows[0].created_at,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/organization/:id ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT o.*, u.email AS owner_email
       FROM organizations o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    const org = result.rows[0];

    // Get all assessments for this org
    const assessments = await query(
      `SELECT id, framework, analysis_depth, status, compliance_score, risk_level, created_at, completed_at
       FROM assessments WHERE org_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      org_id: org.id,
      name: org.name,
      industry: org.industry,
      region: org.region,
      employee_range: org.employee_range,
      contact_name: org.contact_name,
      frameworks: org.frameworks,
      analysis_depth: org.analysis_depth,
      created_at: org.created_at,
      updated_at: org.updated_at,
      assessments: assessments.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/organization (list user's orgs) ──────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, industry, region, frameworks, analysis_depth, created_at
       FROM organizations WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    res.json({ organizations: result.rows, total: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/organization/:id ─────────────────────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, industry, region, employee_range, contact_name, frameworks, analysis_depth } = req.body;

    const result = await query(
      `UPDATE organizations
       SET name=COALESCE($1, name),
           industry=COALESCE($2, industry),
           region=COALESCE($3, region),
           employee_range=COALESCE($4, employee_range),
           contact_name=COALESCE($5, contact_name),
           frameworks=COALESCE($6, frameworks),
           analysis_depth=COALESCE($7, analysis_depth),
           updated_at=NOW()
       WHERE id=$8 AND user_id=$9
       RETURNING *`,
      [name, industry, region, employee_range, contact_name, frameworks, analysis_depth, id, req.user.user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Organization not found.' });
    }

    res.json({ message: 'Organization updated.', organization: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
