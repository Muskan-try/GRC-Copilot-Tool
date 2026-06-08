const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/postgres');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const audit = require('../services/audit.service');

const router = express.Router();

// ─── Multer Config for Policy Uploads ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || './uploads', 'policies');
    require('fs').mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `policy-${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.txt', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported for GRC policies.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

const fs = require('fs');

const axios = require('axios');
const FormData = require('form-data');

// Helper for role checks
const checkPolicyRole = (req, res, next) => {
  const allowed = ['member', 'lead', 'org_admin', 'admin', 'owner'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Policy Hub access requires Member, Lead, Org Admin, or Admin privileges.' });
  }
  next();
};

const requirePolicyWrite = (req, res, next) => {
  const allowed = ['member', 'org_admin', 'admin', 'owner'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Uploading/modifying policies requires Maker (Member), Org Admin, or Admin privileges.' });
  }
  next();
};

const requirePolicyCheck = (req, res, next) => {
  const allowed = ['lead', 'org_admin', 'admin', 'owner'];
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Approving/rejecting policies requires Checker (Lead), Org Admin, or Admin privileges.' });
  }
  next();
};

// ─── POST /api/policies/upload ────────────────────────────────────────────
router.post(
  '/upload',
  authenticate,
  requirePolicyWrite,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No policy file uploaded. Form-data field name must be "file".' });
      }

      // 1. Resolve tenant org_id
      let orgId = req.user.org_id;
      if (req.user.role === 'admin' && (req.body.org_id || req.query.org_id)) {
        orgId = req.body.org_id || req.query.org_id;
      }

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID (org_id) is required.' });
      }

      // 2. Resolve fields
      const originalName = req.file.originalname;
      const policyName = req.body.policy_name || originalName;
      const policyType = req.body.policy_type || 'compulsory';
      const targetFramework = req.body.target_framework || 'ISO/IEC 27001:2022';
      const assessmentId = req.body.assessment_id || null;

      if (policyType !== 'compulsory' && policyType !== 'optional') {
        return res.status(400).json({ error: 'Invalid policy_type. Must be "compulsory" or "optional".' });
      }

      // 3. Delegate to FastAPI compliance agent for dynamic text extraction and AI analysis
      const form = new FormData();
      form.append('file', fs.createReadStream(req.file.path), {
        filename: originalName,
        contentType: req.file.mimetype,
      });
      form.append('selectedFramework', targetFramework);
      form.append('org_id', orgId);

      const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
      logger.info(`Delegating policy analysis to FastAPI at ${FASTAPI_URL}/agent/compliance/analyze-policy`);

      const fastapiResponse = await axios.post(`${FASTAPI_URL}/agent/compliance/analyze-policy`, form, {
        headers: {
          ...form.getHeaders(),
          'X-Internal-Service': 'grc-gateway',
        },
        timeout: 120000,
      });

      const analysisReport = fastapiResponse.data;
      const fileUrl = req.file.path; // Store local upload path
      const status = (analysisReport.gaps && analysisReport.gaps.length > 0) ? 'gaps_found' : 'compliant';
      const complianceScore = parseFloat(analysisReport.score);

      // 5. Database Insertion
      const insertResult = await query(
        `INSERT INTO policies (org_id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, assessment_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, org_id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, created_at, assessment_id`,
        [orgId, policyName, policyType, fileUrl, status, complianceScore, analysisReport, assessmentId]
      );

      const createdPolicy = insertResult.rows[0];
      logger.info(`GRC Policy uploaded and analyzed: ${createdPolicy.policy_name} (${createdPolicy.id}) for org ${orgId} under framework ${targetFramework}`);

      res.status(201).json({
        message: 'GRC Policy uploaded and analyzed successfully.',
        policy: createdPolicy,
        score: createdPolicy.compliance_score,
        gaps: createdPolicy.ai_analysis_report.gaps,
        recommendations: createdPolicy.ai_analysis_report.recommendations
      });

    } catch (err) {
      logger.error('Error in POST /api/policies/upload:', err.response?.data || err.message);
      const status = err.response?.status || 500;
      res.status(status).json({
        error: status >= 500 ? 'Policy analysis service unavailable. Please try again later.' : 'Policy analysis failed.',
      });
    }
  }
);

// GET /api/policies/pending-approvals
router.get(
  '/pending-approvals',
  authenticate,
  requirePolicyCheck,
  async (req, res, next) => {
    try {
      let orgId = req.user.org_id;
      if (req.user.role === 'admin' && (req.query.org_id || req.body.org_id)) {
        orgId = req.query.org_id || req.body.org_id;
      }

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID (org_id) is required.' });
      }

      const fetchResult = await query(
        `SELECT id, org_id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, created_at, updated_at
         FROM policies
         WHERE org_id = $1 AND status = 'PENDING_LEAD_SIGN_OFF'
         ORDER BY created_at DESC`,
        [orgId]
      );

      res.json({
        org_id: orgId,
        count: fetchResult.rowCount,
        policies: fetchResult.rows
      });
    } catch (err) {
      logger.error('Error in GET /api/policies/pending-approvals:', err);
      next(err);
    }
  }
);

// ─── GET /api/policies ────────────────────────────────────────────────────
router.get(
  '/',
  authenticate,
  checkPolicyRole,
  async (req, res, next) => {
    try {
      // 1. Resolve tenant org_id
      let orgId = req.user.org_id;
      if (req.user.role === 'admin' && (req.query.org_id || req.body.org_id)) {
        orgId = req.query.org_id || req.body.org_id;
      }

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID (org_id) is required.' });
      }

      let queryStr = `SELECT id, org_id, policy_name, policy_type, file_url, status, compliance_score, ai_analysis_report, created_at, updated_at
         FROM policies
         WHERE org_id = $1`;
      let queryParams = [orgId];

      if (req.query.assessment_id) {
        queryParams.push(req.query.assessment_id);
        queryStr += ` AND assessment_id = $2`;
      }

      queryStr += ` ORDER BY created_at DESC`;

      // 2. Fetch policies mapping orgId
      const fetchResult = await query(queryStr, queryParams);

      res.json({
        org_id: orgId,
        count: fetchResult.rowCount,
        policies: fetchResult.rows
      });

    } catch (err) {
      logger.error('Error in GET /api/policies:', err);
      next(err);
    }
  }
);

// POST /api/policies/:policyId/approve
router.post(
  '/:policyId/approve',
  authenticate,
  requirePolicyCheck,
  async (req, res, next) => {
    try {
      const { policyId } = req.params;

      // Fetch policy to verify ownership and check gaps
      const policyResult = await query(
        'SELECT org_id, status, ai_analysis_report FROM policies WHERE id = $1',
        [policyId]
      );

      if (!policyResult.rows.length) {
        return res.status(404).json({ error: 'Policy not found.' });
      }

      const policy = policyResult.rows[0];

      // Enforce strict tenant matching to prevent cross-tenant IDOR tampering
      if (req.user.role !== 'admin' && policy.org_id !== req.user.org_id) {
        return res.status(403).json({ error: 'Access denied. Ownership mismatch.' });
      }

      // Update status directly to APPROVED_PRODUCTION
      const updateResult = await query(
        `UPDATE policies
         SET status = 'APPROVED_PRODUCTION', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [policyId]
      );

      logger.info(`Policy approved by Checker ${req.user.user_id}: ${policyId}`);
      audit.log(req.user.user_id, 'policy.approve', 'policy', policyId, { org_id: policy.org_id }, req).catch(() => {});

      res.json({
        message: 'Policy approved successfully.',
        policy: updateResult.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/policies/:policyId/reject
router.post(
  '/:policyId/reject',
  authenticate,
  requirePolicyCheck,
  async (req, res, next) => {
    try {
      const { policyId } = req.params;

      // Fetch policy to verify ownership
      const policyResult = await query(
        'SELECT org_id, status FROM policies WHERE id = $1',
        [policyId]
      );

      if (!policyResult.rows.length) {
        return res.status(404).json({ error: 'Policy not found.' });
      }

      const policy = policyResult.rows[0];

      // Enforce strict tenant matching to prevent cross-tenant IDOR tampering
      if (req.user.role !== 'admin' && policy.org_id !== req.user.org_id) {
        return res.status(403).json({ error: 'Access denied. Ownership mismatch.' });
      }

      // Update status to gaps_found
      const updateResult = await query(
        `UPDATE policies
         SET status = 'gaps_found', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [policyId]
      );

      logger.info(`Policy rejected by Checker ${req.user.user_id}: ${policyId}`);
      audit.log(req.user.user_id, 'policy.reject', 'policy', policyId, { org_id: policy.org_id }, req).catch(() => {});

      res.json({
        message: 'Policy marked as rejected (gaps found).',
        policy: updateResult.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/policies/:policyId/auto-fix
router.post(
  '/:policyId/auto-fix',
  authenticate,
  requirePolicyWrite,
  async (req, res, next) => {
    try {
      const { policyId } = req.params;
      const { score, gaps, recommendations } = req.body;

      // Fetch policy to verify ownership
      const policyResult = await query(
        'SELECT org_id FROM policies WHERE id = $1',
        [policyId]
      );

      if (!policyResult.rows.length) {
        return res.status(404).json({ error: 'Policy not found.' });
      }

      const policy = policyResult.rows[0];

      // Enforce strict tenant matching
      if (req.user.role !== 'admin' && policy.org_id !== req.user.org_id) {
        return res.status(403).json({ error: 'Access denied. Ownership mismatch.' });
      }

      const aiReport = {
        score: score,
        gaps: gaps,
        recommendations: recommendations
      };

      const updateResult = await query(
        `UPDATE policies
         SET compliance_score = $1, ai_analysis_report = $2, status = 'PENDING_LEAD_SIGN_OFF', updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [parseFloat(score), JSON.stringify(aiReport), policyId]
      );

      logger.info(`Policy ${policyId} auto-fixed by Maker ${req.user.user_id} and marked as pending`);
      audit.log(req.user.user_id, 'policy.autofix', 'policy', policyId, { org_id: policy.org_id }, req).catch(() => {});

      res.json({
        message: 'Policy auto-fixed successfully and sent to Lead for approval.',
        policy: updateResult.rows[0]
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
