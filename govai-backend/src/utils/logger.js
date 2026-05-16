// src/utils/logger.js
// Structured logger using Winston.
// Usage:  const logger = require('../utils/logger');
//         logger.info('Upload complete', { callId, bucket });
//         logger.error('S3 failed', { error: err.message });

const { createLogger, format, transports } = require('winston');
const config = require('../config');

const { combine, timestamp, printf, colorize, json, errors } = format;

// Human-readable format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `[${timestamp}] ${level}: ${message}${extra}`;
  })
);

// JSON format for production (parseable by CloudWatch, Datadog, etc.)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: config.server.env === 'production' ? 'info' : 'debug',
  format: config.server.env === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    // Uncomment for file logging:
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [new transports.Console()],
});

module.exports = logger;
