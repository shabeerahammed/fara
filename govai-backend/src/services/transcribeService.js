// src/services/transcribeService.js
// Submits audio to a local Whisper server for transcription.
// In mock mode returns realistic sample transcripts immediately.

const { v4: uuidv4 } = require('uuid');
const axios   = require('axios');
const config  = require('../config');
const logger  = require('../utils/logger');
const { downloadAudio } = require('./s3Service');
const { withRetry } = require('../utils/retry');

// ─── Mock transcripts pool ──────────────────────────────────
const MOCK_TRANSCRIPTS = [
  {
    text: "Hello, I need to change the delivery address for my order number 88234. The new address is 45 Marina Tower, Dubai Marina, Dubai. My phone number is 050-123-4567. Please update it as soon as possible.",
    intent_hint: 'CHANGE_ADDRESS',
    confidence: 87,
  },
  {
    text: "Hi, I'm calling to check the status of my refund for order 77891. I was charged twice and I want my money back immediately or I'm filing a chargeback!",
    intent_hint: 'REFUND_REQUEST',
    confidence: 72,
  },
  {
    text: "Good morning. I placed order number 55123 last week and it still hasn't arrived. The tracking says it's in transit but I need it by tomorrow for an event.",
    intent_hint: 'DELIVERY_ENQUIRY',
    confidence: 91,
  },
  {
    text: "I want to cancel my subscription. I found a better deal elsewhere. My account email is customer@example.com and my billing address is 12 Al Wasl Road, Jumeirah.",
    intent_hint: 'CANCELLATION',
    confidence: 69,
  },
  {
    text: "This is absolutely ridiculous. Your product is complete garbage. I'm going to sue your company and report you to the consumer authority. This is unacceptable!",
    intent_hint: 'COMPLAINT',
    confidence: 95,
  },
];

// ─── Mock implementation ─────────────────────────────────────
async function mockTranscribe(audioKey) {
  logger.debug('[MOCK Whisper] Simulating transcription', { audioKey });
  await new Promise(r => setTimeout(r, 800)); // simulate processing time

  // Pick a transcript deterministically based on the audio key
  const idx = Math.abs(audioKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % MOCK_TRANSCRIPTS.length;
  const sample = MOCK_TRANSCRIPTS[idx];

  return {
    transcript: sample.text,
    confidence: sample.confidence,
    language:   'en',
    job_name:   `mock-job-${uuidv4().slice(0, 8)}`,
    mock:       true,
  };
}

// ─── Real implementation (Whisper API) ───────────────────────

/**
 * Transcribe an audio file using a local Whisper server.
 * Expects a whisper.cpp server running at WHISPER_URL (default http://localhost:8080)
 * @param {string} audioKey  - S3 object key
 * @param {string} callId    - Used as part of the job name
 */
async function transcribeAudio(audioKey, callId) {
  if (config.useMockAws) return mockTranscribe(audioKey);

  logger.info('Starting local Whisper transcription', { audioKey });

  // 1. Download the file buffer from S3 (or local storage if customized)
  const buffer = await downloadAudio(audioKey);
  
  // 2. Prepare the multipart form data for Whisper
  // The whisper.cpp server expects the file under the 'file' key.
  // Using FormData is possible if polyfilled, but we can also use axios built-in form serialization if supported.
  // Since we are in Node, we can use Blob or just construct a multipart request manually if needed.
  // Since axios >= 1.x supports posting form data easily with objects containing Buffers, we can try this:
  
  const formData = new FormData();
  // We need to convert Buffer to Blob for FormData in Node 18+
  const blob = new Blob([buffer], { type: audioKey.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav' });
  formData.append('file', blob, audioKey.split('/').pop());
  formData.append('response_format', 'json');
  formData.append('temperature', '0.0'); // deterministic transcription

  const endpoint = `${config.whisper.url}/inference`;

  const response = await withRetry(
    () => axios.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000 // 5 minute timeout for long audio on local hardware
    }),
    config.retry.maxRetries,
    config.retry.delayMs,
    'Whisper Inference API'
  );

  const data = response.data;
  
  // whisper.cpp /inference returns { text: "..." }
  if (!data || !data.text) {
    throw new Error('Whisper returned invalid response format.');
  }

  // Whisper.cpp HTTP server doesn't output confidence natively in simple JSON mode, 
  // so we'll mock a high confidence value if it succeeded.
  return { 
    transcript: data.text.trim(), 
    confidence: 90, 
    language:   'en', 
    job_name:   `local-whisper-${callId}` 
  };
}

module.exports = { transcribeAudio };
