// src/utils/retry.js
// Generic retry with exponential back-off.
// Use for any flaky I/O (S3, Transcribe, Bedrock, etc.)

const logger = require('./logger');

/**
 * Retry an async function up to `maxRetries` times with exponential back-off.
 *
 * @param {Function} fn        - Async function to call.
 * @param {number}   maxRetries - Max attempts (default 3).
 * @param {number}   delayMs   - Base delay in ms (doubles each attempt).
 * @param {string}   label     - Human-readable label for log messages.
 * @returns {Promise<*>}
 */
async function withRetry(fn, maxRetries = 3, delayMs = 1000, label = 'operation') {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 1) {
        logger.info(`${label} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const wait = delayMs * Math.pow(2, attempt - 1); // 1s, 2s, 4s …
      logger.warn(`${label} failed (attempt ${attempt}/${maxRetries}) — retrying in ${wait}ms`, {
        error: err.message,
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }
    }
  }

  logger.error(`${label} failed after ${maxRetries} attempts`, { error: lastError.message });
  throw lastError;
}

module.exports = { withRetry };
