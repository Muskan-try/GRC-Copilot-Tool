const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

// GET /api/admin/dashboard-data — Retrieve specialized dashboard statistics (Admin only)
router.get('/dashboard-data', authenticate, requireAdmin, adminController.getDashboardData);

module.exports = router;
