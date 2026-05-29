const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.user_id,
  });

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.message });
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Resource already exists.' });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Invalid reference. Related resource not found.' });
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({ error: message });
};

const notFound = (req, res) => {
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

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

module.exports = { errorHandler, notFound, AppError };
