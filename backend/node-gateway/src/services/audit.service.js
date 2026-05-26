const { query } = require('../config/postgres');
const logger = require('../config/logger');

const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_REGISTER: 'user.register',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGE: 'user.password_change',
  USER_PROFILE_UPDATE: 'user.profile_update',

  ASSESSMENT_CREATE: 'assessment.create',
  ASSESSMENT_UPDATE: 'assessment.update',
  ASSESSMENT_COMPLETE: 'assessment.complete',
  ASSESSMENT_DELETE: 'assessment.delete',

  QUESTIONNAIRE_START: 'questionnaire.start',
  RESPONSE_SUBMIT: 'response.submit',
  RESPONSE_BATCH_SUBMIT: 'response.batch_submit',

  ANALYSIS_TRIGGER: 'analysis.trigger',
  ANALYSIS_COMPLETE: 'analysis.complete',
  ANALYSIS_FAILED: 'analysis.failed',

  REPORT_VIEW: 'report.view',
  REPORT_GENERATE: 'report.generate',
  REPORT_DOWNLOAD: 'report.download',

  RISK_UPDATE: 'risk.update',
  EVIDENCE_UPLOAD: 'evidence.upload',
  EVIDENCE_DELETE: 'evidence.delete',
  EVIDENCE_VIEW: 'evidence.view',

  COMPLIANCE_AGENT_RUN: 'compliance_agent.run',
  COMPLIANCE_AGENT_UPLOAD: 'compliance_agent.upload',
  COMPLIANCE_AGENT_REPORT: 'compliance_agent.report',

  AI_CHAT: 'ai.chat',

  ORG_CREATE: 'organization.create',
  ORG_UPDATE: 'organization.update',

  AUDIT_LOG_VIEW: 'audit_log.view',
  AUDIT_LOG_EXPORT: 'audit_log.export',
};

async function log(userId, action, resourceType, resourceId = null, details = {}, req = null) {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
      : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress, userAgent]
    );
  } catch (err) {
    logger.error('Audit log write failed:', err.message);
  }
}

async function getLogs({ userId = null, action = null, resourceType = null, resourceId = null, limit = 100, offset = 0, from = null, to = null }) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`al.user_id = $${paramIndex++}`);
    params.push(userId);
  }
  if (action) {
    conditions.push(`al.action = $${paramIndex++}`);
    params.push(action);
  }
  if (resourceType) {
    conditions.push(`al.resource_type = $${paramIndex++}`);
    params.push(resourceType);
  }
  if (resourceId) {
    conditions.push(`al.resource_id = $${paramIndex++}`);
    params.push(resourceId);
  }
  if (from) {
    conditions.push(`al.created_at >= $${paramIndex++}`);
    params.push(from);
  }
  if (to) {
    conditions.push(`al.created_at <= $${paramIndex++}`);
    params.push(to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM audit_logs al ${whereClause}`, params);
  const totalCount = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT al.*, u.email AS user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    logs: result.rows,
    total: totalCount,
    limit,
    offset,
  };
}

async function getLogsByUser(userId, limit = 50, offset = 0) {
  return getLogs({ userId, limit, offset });
}

async function getLogsByResource(resourceType, resourceId, limit = 50, offset = 0) {
  return getLogs({ resourceType, resourceId, limit, offset });
}

async function getRecentActions(limit = 20) {
  return getLogs({ limit });
}

module.exports = {
  AUDIT_ACTIONS,
  log,
  getLogs,
  getLogsByUser,
  getLogsByResource,
  getRecentActions,
};
