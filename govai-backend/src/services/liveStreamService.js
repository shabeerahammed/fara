// src/services/liveStreamService.js
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { v4: uuidv4 } = require('uuid');
const axios          = require('axios');
const FormData       = require('form-data'); // npm i form-data — avoids Node Blob/FormData compat issues
const config         = require('../config');
const logger         = require('../utils/logger');
const { analyzeTranscript }   = require('./ollamaService');
const { evaluateGovernance }  = require('./governanceService');

const ffmpegStatic = require('ffmpeg-static');
const util = require('util');
const { exec } = require('child_process');
const execPromise = util.promisify(exec);

// ─── In-memory store for active live calls ────────────────────────────────────
const activeCalls = new Map();

// ─── Mock sentences (used when config.useMockAws = true) ─────────────────────
const MOCK_SENTENCES = [
  'Hello, I am calling about my recent order.',
  'I am very upset because it has not arrived.',
  'Your delivery service is absolutely terrible.',
  'I want to cancel the order and get a full refund right now.',
  'This is unacceptable and I demand to speak to a manager.',
];

// ─── Whisper chunk timeout (live calls must be fast) ─────────────────────────
const WHISPER_CHUNK_TIMEOUT_MS = 12000; // 12 s — fail fast for live audio

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensure a call entry exists in activeCalls.
 * @param {string} callId
 */
function initCall(callId) {
  if (!activeCalls.has(callId)) {
    activeCalls.set(callId, {
      transcript:          '',
      chunkCount:          0,
      lastAnalyzedLength:  0,
      audioBufferArray:    [], // Store accumulated chunks
    });
  }
}

/**
 * Remove a finished call from memory. Call this from the socket
 * handler that handles 'call:stream:end'.
 * @param {string} callId
 */
function endCall(callId) {
  if (activeCalls.has(callId)) {
    activeCalls.delete(callId);
    logger.info('Live call state cleared', { callId });
  }
}

/**
 * Transcribe a single audio chunk using the local Whisper server.
 * Writes a temp file, posts it, then always cleans up (even on error).
 * @param {Buffer} audioBuffer
 * @returns {Promise<string>} Transcribed text, or empty string on failure.
 */
async function transcribeChunkWithWhisper(audioBuffer) {
  const tempWebm = path.join(os.tmpdir(), `chunk-${uuidv4()}.webm`);
  const tempWav = path.join(os.tmpdir(), `chunk-${uuidv4()}.wav`);

  try {
    fs.writeFileSync(tempWebm, audioBuffer);

    // Convert webm to 16kHz mono WAV (required by whisper.cpp)
    await execPromise(`"${ffmpegStatic}" -i "${tempWebm}" -ar 16000 -ac 1 -c:a pcm_s16le "${tempWav}" -y`);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempWav), {
      filename:    'chunk.wav',
      contentType: 'audio/wav',
    });
    formData.append('response_format', 'json');

    const response = await axios.post(
      `${config.whisper.url}/inference`,
      formData,
      {
        headers: formData.getHeaders(),
        timeout: WHISPER_CHUNK_TIMEOUT_MS,
      }
    );

    return response.data?.text?.trim() ?? '';

  } catch (err) {
    logger.error('Live chunk Whisper transcription failed', { error: err.message });
    return '';
  } finally {
    // Always remove temp files — even if axios, write, or ffmpeg threw
    try { fs.unlinkSync(tempWebm); } catch { /* already gone */ }
    try { fs.unlinkSync(tempWav); } catch { /* already gone */ }
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Process one incoming audio chunk for a live call.
 *
 * @param {string}          callId      - Unique call identifier
 * @param {Buffer|ArrayBuffer} audioBuffer - Raw audio data from the socket
 * @param {import('socket.io').Server} io - Socket.IO server instance
 */
async function processLiveChunk(callId, audioBuffer, io) {
  initCall(callId);
  const state = activeCalls.get(callId);
  state.chunkCount++;

  // Normalise to Node Buffer regardless of what the socket delivers
  const buf = Buffer.isBuffer(audioBuffer)
    ? audioBuffer
    : Buffer.from(audioBuffer);

  // Accumulate the audio chunks so ffmpeg has the WebM header from the first chunk
  state.audioBufferArray.push(buf);

  // ── Transcription ──────────────────────────────────────────────────────────

  if (config.useMockAws) {
    // Deterministic mock: cycle through MOCK_SENTENCES
    const newText = MOCK_SENTENCES[(state.chunkCount - 1) % MOCK_SENTENCES.length] + ' ';
    await new Promise(r => setTimeout(r, 500)); // simulate latency
    state.transcript += newText;
  } else {
    const combinedBuffer = Buffer.concat(state.audioBufferArray);
    const whisperText = await transcribeChunkWithWhisper(combinedBuffer);
    
    if (whisperText) {
      // Overwrite transcript instead of appending because Whisper re-transcribes the whole accumulated audio
      state.transcript = whisperText;
    }
  }

  if (!state.transcript.trim()) {
    // Nothing new to work with — skip emit and analysis
    return;
  }

  // Emit updated transcript to THIS call's room only (not all sockets)
  io.to(callId).emit('call:stream:transcript', {
    callId,
    text: state.transcript,
  });

  // ── AI Analysis (throttled by content growth) ──────────────────────────────
  const transcriptGrewEnough = state.transcript.length > state.lastAnalyzedLength + 50;

  if (transcriptGrewEnough) {
    state.lastAnalyzedLength = state.transcript.length;

    try {
      // 1. Ollama intent/sentiment analysis
      const aiResult = await analyzeTranscript(state.transcript);
      io.to(callId).emit('call:stream:analysis', { callId, ...aiResult });

      // 2. Governance rule evaluation
      const govResult = evaluateGovernance(aiResult, state.transcript);
      if (govResult.flags?.length > 0) {
        govResult.flags.forEach(flag => {
          io.to(callId).emit('call:stream:flag', { callId, flag });
        });
      }
    } catch (err) {
      logger.error('Live AI analysis failed', { callId, error: err.message });
    }
  }
}

module.exports = { processLiveChunk, endCall };
