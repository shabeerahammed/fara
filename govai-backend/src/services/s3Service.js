// src/services/s3Service.js
// Handles all AWS S3 interactions.
// When config.useMockAws === true, returns deterministic mock URLs — no AWS needed.

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const config  = require('../config');
const logger  = require('../utils/logger');
const { withRetry } = require('../utils/retry');

// ─── Real S3 client ──────────────────────────────────────────
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey }
        : undefined, // fall back to IAM role / env chain
    });
  }
  return s3Client;
}

// ─── Mock implementation ─────────────────────────────────────
const mockUpload = async (buffer, fileName, mimeType) => {
  const key = `audio/${uuidv4()}-${fileName}`;
  logger.debug('[MOCK S3] Simulating upload', { key, size: buffer.length });
  await new Promise(r => setTimeout(r, 300)); // simulate latency
  return {
    key,
    url: `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`,
    bucket: config.aws.s3Bucket,
    mock: true,
  };
};

const mockGetUrl = async (key) => {
  await new Promise(r => setTimeout(r, 100));
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}?mock-presigned=true`;
};

// ─── Service API ─────────────────────────────────────────────

/**
 * Upload an audio buffer to S3.
 * @param {Buffer} buffer    - File contents
 * @param {string} fileName  - Original file name
 * @param {string} mimeType  - e.g. 'audio/mpeg'
 * @returns {{ key, url, bucket }}
 */
async function uploadAudio(buffer, fileName, mimeType) {
  if (config.useMockAws) {
    return mockUpload(buffer, fileName, mimeType);
  }

  const key = `audio/${uuidv4()}-${fileName}`;
  const client = getS3Client();

  await withRetry(
    () => client.send(new PutObjectCommand({
      Bucket:      config.aws.s3Bucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
      Metadata:    { originalName: fileName, uploadedAt: new Date().toISOString() },
    })),
    config.retry.maxRetries,
    config.retry.delayMs,
    'S3 Upload'
  );

  const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
  logger.info('Audio uploaded to S3', { key, bucket: config.aws.s3Bucket });
  return { key, url, bucket: config.aws.s3Bucket };
}

/**
 * Generate a short-lived presigned GET URL for a stored audio file.
 * @param {string} key   - S3 object key
 * @param {number} expiresIn - Seconds (default 3600)
 */
async function getPresignedUrl(key, expiresIn = 3600) {
  if (config.useMockAws) return mockGetUrl(key);

  const client  = getS3Client();
  const command = new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete an object from S3 (e.g. cleanup on failure).
 * @param {string} key
 */
async function deleteObject(key) {
  if (config.useMockAws) {
    logger.debug('[MOCK S3] Simulating delete', { key });
    return;
  }

  const client = getS3Client();
  await withRetry(
    () => client.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key })),
    config.retry.maxRetries,
    config.retry.delayMs,
    'S3 Delete'
  );
  logger.info('S3 object deleted', { key });
}

/**
 * Download an object from S3.
 * @param {string} key
 * @returns {Promise<Buffer>}
 */
async function downloadAudio(key) {
  if (config.useMockAws) {
    logger.debug('[MOCK S3] Simulating download', { key });
    return Buffer.from([]);
  }

  const client = getS3Client();
  const response = await withRetry(
    () => client.send(new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: key })),
    config.retry.maxRetries,
    config.retry.delayMs,
    'S3 Download'
  );
  
  return Buffer.from(await response.Body.transformToByteArray());
}

module.exports = { uploadAudio, getPresignedUrl, deleteObject, downloadAudio };
