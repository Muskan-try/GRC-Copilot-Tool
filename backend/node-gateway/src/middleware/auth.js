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
    let userRecord;
    try {
      const result = await query(
        'SELECT id, email, role, is_active FROM users WHERE id = $1',
        [decoded.user_id]
      );
      if (result.rows.length) {
        userRecord = result.rows[0];
      }
    } catch (dbErr) {
      logger.warn(`PostgreSQL is offline, trusting JWT decoded payload in auth middleware: ${dbErr.message}`);
      userRecord = {
        id: decoded.user_id,
        email: decoded.email,
        role: decoded.role || 'user',
        is_active: true
      };
    }

    if (!userRecord || !userRecord.is_active) {
      return res.status(401).json({ error: 'User not found or account deactivated.' });
    }

    let orgId = null;
    let memberRole = null;
    try {
      const orgRes = await query(
        "SELECT org_id, role FROM org_members WHERE user_id = $1 AND status = 'active' LIMIT 1",
        [userRecord.id]
      );
      if (orgRes.rows.length) {
        orgId = orgRes.rows[0].org_id;
        memberRole = orgRes.rows[0].role;
      } else {
        const ownerRes = await query(
          'SELECT id FROM organizations WHERE user_id = $1 LIMIT 1',
          [userRecord.id]
        );
        if (ownerRes.rows.length) {
          orgId = ownerRes.rows[0].id;
          memberRole = 'org_admin'; // Default fallback role for creators
        }
      }
    } catch (dbErr) {
      logger.error('Failed to dynamically fetch org_id and role in auth middleware, falling back to JWT decoded:', dbErr.message);
    }

    if (!orgId) {
      orgId = decoded.org_id || null;
    }

    req.user = {
      user_id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role === 'admin' ? 'admin' : (memberRole || userRecord.role),
      org_id: orgId
    };

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
