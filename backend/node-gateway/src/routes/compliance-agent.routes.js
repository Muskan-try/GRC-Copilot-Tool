const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { authenticate } = require('../middleware/auth');
const logger = require('../config/logger');

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

    const response = await axios.post(`${FASTAPI_URL}/agent/compliance/run`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Internal-Service': 'grc-gateway',
      },
      timeout: 120000, // Agent might take a while
    });

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
    res.json(response.data);
  } catch (err) {
    logger.error('Get report from FastAPI failed:', err.message);
    next(err);
  }
});

module.exports = router;
