const logger = require('../config/logger');

const notFound = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.url}`,
    available_routes: [
      'GET  /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET  /api/auth/profile',
      'POST /api/organization/setup',
      'GET  /api/organization/:id',
      'GET  /api/questionnaire/generate',
      'POST /api/responses/submit',
      'GET  /api/dashboard/:assessmentId',
      'GET  /api/reports/:reportId',
    ],
  });
};

module.exports = { notFound };
