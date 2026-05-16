// src/middleware/errorHandler.js
// Global Express error handler — must be registered LAST in app.js.
// Catches any error thrown or passed via next(err) in any route/middleware.

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 100MB.' });
  }
  if (err.message && err.message.startsWith('Unsupported file type')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', details });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }

  // Log unexpected errors
  logger.error('Unhandled error', {
    method: req.method,
    path:   req.path,
    error:  err.message,
    stack:  process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success:   false,
    message:   status === 500 ? 'Internal server error' : err.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { error: err.message }),
  });
}

module.exports = errorHandler;
