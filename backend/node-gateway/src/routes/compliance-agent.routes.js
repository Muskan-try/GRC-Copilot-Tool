const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');
const audit = require('../services/audit.service');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// POST /api/agent/compliance/upload-policy
router.post('/upload-policy', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${FASTAPI_URL}/agent/compliance/upload-policy`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Service': 'grc-gateway',
      },
    });

    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.COMPLIANCE_AGENT_UPLOAD, 'compliance_agent', null, { file_name: req.file.originalname, file_size: req.file.size }, req).catch(() => {});
    res.json(response.data);
  } catch (err) {
    logger.error('Upload to FastAPI failed:', err.message);
    next(err);
  }
});

// POST /api/agent/compliance/run
router.post('/run', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    
    // Pass the target framework choice if provided
    if (req.body.target_framework) {
      form.append('target_framework', req.body.target_framework);
    }

    const response = await axios.post(`${FASTAPI_URL}/agent/compliance/run`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Service': 'grc-gateway',
      },
      timeout: 120000, // Agent might take a while
    });

    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.COMPLIANCE_AGENT_RUN, 'compliance_agent', null, { 
      file_name: req.file.originalname,
      target_framework: req.body.target_framework || 'all'
    }, req).catch(() => {});
    res.json(response.data);
  } catch (err) {
    logger.error('Agent run failed:', err.message);
    next(err);
  }
});

// GET /api/agent/compliance/report/:reportId
router.get('/report/:reportId', authenticate, async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const response = await axios.get(`${FASTAPI_URL}/agent/compliance/report/${reportId}`, {
      headers: { 'X-Internal-Service': 'grc-gateway' },
    });
    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.COMPLIANCE_AGENT_REPORT, 'compliance_agent', reportId, {}, req).catch(() => {});
    res.json(response.data);
  } catch (err) {
    logger.error('Get report from FastAPI failed:', err.message);
    next(err);
  }
});

// POST /api/agent/compliance/auto-answer
router.post('/auto-answer', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    if (!req.body.assessment_id) return res.status(400).json({ error: 'assessment_id is required.' });

    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('assessment_id', req.body.assessment_id);
    if (req.body.org_website) form.append('org_website', req.body.org_website);

    const response = await axios.post(`${FASTAPI_URL}/agent/compliance/auto-answer`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Service': 'grc-gateway',
      },
      timeout: 120000,
    });

    audit.log(req.user.user_id, audit.AUDIT_ACTIONS.COMPLIANCE_AGENT_RUN, 'compliance_agent', null,
      { file_name: req.file.originalname, assessment_id: req.body.assessment_id }, req).catch(() => {});
    res.json(response.data);
  } catch (err) {
    logger.error('Auto-answer failed:', err.message);
    next(err);
  }
});

module.exports = router;
