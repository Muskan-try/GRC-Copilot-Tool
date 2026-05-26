const jwt = require('jsonwebtoken');
const { query } = require('../config/postgres');
const logger = require('../config/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const result = await query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.user_id]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or account deactivated.' });
    }

    req.user = {
      user_id: decoded.user_id,
      email: result.rows[0].email,
      role: result.rows[0].role,
    };

    try {
      const orgResult = await query(
        `SELECT om.org_id, om.role AS org_role, om.status AS org_status
         FROM org_members om
         WHERE om.user_id = $1 AND om.status = 'active'
         ORDER BY om.role = 'owner' DESC
         LIMIT 1`,
        [decoded.user_id]
      );
      if (orgResult.rows.length) {
        req.user.org_id = orgResult.rows[0].org_id;
        req.user.org_role = orgResult.rows[0].org_role;
      } else {
        req.user.org_id = null;
        req.user.org_role = null;
      }
    } catch (_) {
      req.user.org_id = null;
      req.user.org_role = null;
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
