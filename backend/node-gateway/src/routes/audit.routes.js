const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const audit = require('../services/audit.service');
const { query } = require('../config/postgres');
const router = express.Router();

// GET /api/audit/logs — Query audit logs with filters
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const {
      user_id, action, resource_type, resource_id,
      limit = 100, offset = 0, from, to,
    } = req.query;

    // Non-admin users can only see their own logs
    const effectiveUserId = req.user.role === 'admin' ? (user_id || null) : req.user.user_id;

    const result = await audit.getLogs({
      userId: effectiveUserId,
      action: action || null,
      resourceType: resource_type || null,
      resourceId: resource_id || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      from: from || null,
      to: to || null,
    });

    // Log this as an audit log view (only for admins viewing others)
    if (req.user.role === 'admin' && user_id && user_id !== req.user.user_id) {
      audit.log(req.user.user_id, audit.AUDIT_ACTIONS.AUDIT_LOG_VIEW, 'audit_log', null, {
        viewed_user_id: user_id,
        filters: { action, resource_type, resource_id, from, to },
      }, req).catch(() => {});
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/audit/stats — Get audit summary stats (admin only)
router.get('/stats', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const totalResult = await query('SELECT COUNT(*) FROM audit_logs');
    const actionResult = await query(
      'SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 20'
    );
    const dailyResult = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM audit_logs
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`
    );
    const userResult = await query(
      `SELECT u.email, COUNT(*) as count
       FROM audit_logs al
       JOIN users u ON u.id = al.user_id
       GROUP BY u.email
       ORDER BY count DESC
       LIMIT 10`
    );

    res.json({
      total: parseInt(totalResult.rows[0].count),
      by_action: actionResult.rows,
      last_30_days: dailyResult.rows,
      top_users: userResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
