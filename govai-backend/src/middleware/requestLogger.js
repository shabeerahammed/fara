// src/middleware/requestLogger.js
// Logs every incoming request with timing information.
// Uses Morgan under the hood but adds structured metadata.

const morgan = require('morgan');
const logger = require('../utils/logger');

// Create a write stream that pipes Morgan tokens into Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Compact format: METHOD /path HTTP/version STATUS bytes - time
const format = ':method :url :status :res[content-length] - :response-time ms';

module.exports = morgan(format, { stream });
