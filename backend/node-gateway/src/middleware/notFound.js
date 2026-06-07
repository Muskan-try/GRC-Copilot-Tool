const logger = require('../config/logger');

const notFound = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    error: 'Endpoint not found.',
  });
};

module.exports = { notFound };
