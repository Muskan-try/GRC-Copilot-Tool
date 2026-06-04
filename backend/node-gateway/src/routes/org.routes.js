const express = require('express');
const { authenticate } = require('../middleware/auth');
const orgController = require('../controllers/org.controller');

const router = express.Router();

// GET /api/org/dashboard-data — Retrieve specialized dashboard statistics for Org Admins
router.get('/dashboard-data', authenticate, orgController.getOrgDashboardData);

module.exports = router;
