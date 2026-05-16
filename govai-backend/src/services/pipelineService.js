// src/services/pipelineService.js
// ─────────────────────────────────────────────────────────────
// Orchestrates the complete call processing pipeline:
//   UPLOAD → TRANSCRIBE → AI ANALYSIS → GOVERNANCE → DELIVERY
//
// Each stage is tracked individually so partial failures are visible.
// Emits WebSocket events so the frontend can watch progress in real time.
// ─────────────────────────────────────────────────────────────

const { transcribeAudio }    = require('./transcribeService');
const { analyzeTranscript }  = require('./ollamaService');
const { evaluateGovernance } = require('./governanceService');
const { sendToDelivery }     = require('./deliveryService');
const CallLog                = require('../models/CallLog');
const logger                 = require('../utils/logger');

/**
 * Record a pipeline stage result on the call log.
 * @param {Document} callLog
 * @param {string}   stage
 * @param {'SUCCESS'|'FAILED'|'SKIPPED'} status
 * @param {string}   message
 * @param {number}   startTime  - Date.now() at stage start
 */
async function recordStage(callLog, stage, status, message, startTime) {
  callLog.pipeline_stages.push({
    stage,
    status,
    message,
    duration_ms:   Date.now() - startTime,
    completed_at:  new Date(),
  });
  await callLog.save();
}

/**
 * Emit a Socket.io event if io is available.
 */
function emit(io, event, data) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Run the full processing pipeline for a call.
 *
 * @param {string}   callId   - Unique call identifier
 * @param {string}   audioKey - S3 object key of the uploaded audio
 * @param {object}   io       - Socket.io instance (nullable)
 * @returns {Promise<Document>} - Updated CallLog document
 */
async function runPipeline(callId, audioKey, io = null) {
  const callLog = await CallLog.findOne({ call_id: callId });
  if (!callLog) throw new Error(`CallLog not found: ${callId}`);

  callLog.processing_status = 'PROCESSING';
  await callLog.save();

  emit(io, 'pipeline:start', { callId, status: 'PROCESSING' });
  logger.info('Pipeline started', { callId, audioKey });

  // ── STAGE 1: TRANSCRIBE ──────────────────────────────────
  let transcript = '';
  {
    const t0 = Date.now();
    emit(io, 'pipeline:stage', { callId, stage: 'TRANSCRIBE', status: 'IN_PROGRESS' });
    try {
      const result = await transcribeAudio(audioKey, callId);
      transcript = result.transcript;

      callLog.transcript         = transcript;
      callLog.transcribe_job     = result.job_name;
      callLog.transcribe_status  = 'COMPLETED';
      callLog.ai_result.confidence = result.confidence;

      await recordStage(callLog, 'TRANSCRIBE', 'SUCCESS', `Transcribed ${transcript.length} chars`, t0);
      emit(io, 'pipeline:stage', { callId, stage: 'TRANSCRIBE', status: 'SUCCESS', data: { length: transcript.length } });
      logger.info('Transcription complete', { callId, chars: transcript.length });
    } catch (err) {
      callLog.transcribe_status = 'FAILED';
      callLog.error = err.message;
      callLog.processing_status = 'FAILED';
      await recordStage(callLog, 'TRANSCRIBE', 'FAILED', err.message, t0);
      emit(io, 'pipeline:stage', { callId, stage: 'TRANSCRIBE', status: 'FAILED', error: err.message });
      emit(io, 'pipeline:end',   { callId, status: 'FAILED', error: err.message });
      return callLog;
    }
  }

  // ── STAGE 2: AI ANALYSIS (BEDROCK) ──────────────────────
  let aiResult = {};
  {
    const t0 = Date.now();
    emit(io, 'pipeline:stage', { callId, stage: 'AI_ANALYSIS', status: 'IN_PROGRESS' });
    try {
      aiResult = await analyzeTranscript(transcript);

      callLog.ai_result = {
        intent:     aiResult.intent,
        entities:   aiResult.entities,
        summary:    aiResult.summary,
        confidence: aiResult.confidence,
      };

      await recordStage(callLog, 'AI_ANALYSIS', 'SUCCESS', `Intent: ${aiResult.intent}, Confidence: ${aiResult.confidence}%`, t0);
      emit(io, 'pipeline:stage', { callId, stage: 'AI_ANALYSIS', status: 'SUCCESS', data: { intent: aiResult.intent, confidence: aiResult.confidence } });
      logger.info('AI analysis complete', { callId, intent: aiResult.intent, confidence: aiResult.confidence });
    } catch (err) {
      callLog.error = err.message;
      callLog.processing_status = 'FAILED';
      await recordStage(callLog, 'AI_ANALYSIS', 'FAILED', err.message, t0);
      emit(io, 'pipeline:stage', { callId, stage: 'AI_ANALYSIS', status: 'FAILED', error: err.message });
      emit(io, 'pipeline:end',   { callId, status: 'FAILED', error: err.message });
      return callLog;
    }
  }

  // ── STAGE 3: GOVERNANCE ──────────────────────────────────
  let governanceResult = {};
  {
    const t0 = Date.now();
    emit(io, 'pipeline:stage', { callId, stage: 'GOVERNANCE', status: 'IN_PROGRESS' });
    try {
      governanceResult = evaluateGovernance(aiResult, transcript);

      callLog.governance_result = {
        status:           governanceResult.status,
        governance_score: governanceResult.governance_score,
        flags:            governanceResult.flags,
        masked_transcript:governanceResult.masked_transcript,
      };

      await recordStage(callLog, 'GOVERNANCE', 'SUCCESS',
        `Status: ${governanceResult.status}, Score: ${governanceResult.governance_score}`, t0);
      emit(io, 'pipeline:stage', {
        callId, stage: 'GOVERNANCE', status: 'SUCCESS',
        data: { governance_status: governanceResult.status, score: governanceResult.governance_score }
      });
      logger.info('Governance evaluation complete', { callId, status: governanceResult.status });
    } catch (err) {
      // Governance failure is non-fatal — we still save what we have
      logger.error('Governance evaluation error', { callId, error: err.message });
      await recordStage(callLog, 'GOVERNANCE', 'FAILED', err.message, t0);
    }
  }

  // ── STAGE 4: DELIVERY ────────────────────────────────────
  {
    const t0 = Date.now();
    emit(io, 'pipeline:stage', { callId, stage: 'DELIVERY', status: 'IN_PROGRESS' });

    if (governanceResult.status === 'BLOCKED') {
      // BLOCKED calls never reach the delivery system
      callLog.delivery = { status: 'BLOCKED', webhook_sent: false };
      await recordStage(callLog, 'DELIVERY', 'SKIPPED', 'Call blocked by governance rules', t0);
      emit(io, 'pipeline:stage', { callId, stage: 'DELIVERY', status: 'SKIPPED', reason: 'GOVERNANCE_BLOCKED' });
    } else {
      try {
        const deliveryRes = await sendToDelivery({
          callId,
          intent:           aiResult.intent,
          entities:         aiResult.entities,
          governanceStatus: governanceResult.status,
          governanceScore:  governanceResult.governance_score,
          flags:            governanceResult.flags,
          summary:          aiResult.summary,
        });

        callLog.delivery = {
          status:       'SENT',
          webhook_sent: true,
          sent_at:      new Date(),
          response:     deliveryRes,
        };

        await recordStage(callLog, 'DELIVERY', 'SUCCESS', 'Payload sent to delivery system', t0);
        emit(io, 'pipeline:stage', { callId, stage: 'DELIVERY', status: 'SUCCESS', data: deliveryRes });
      } catch (err) {
        callLog.delivery = { status: 'FAILED', webhook_sent: false };
        await recordStage(callLog, 'DELIVERY', 'FAILED', err.message, t0);
        emit(io, 'pipeline:stage', { callId, stage: 'DELIVERY', status: 'FAILED', error: err.message });
        logger.error('Delivery webhook failed', { callId, error: err.message });
      }
    }
  }

  // ── Finalise ─────────────────────────────────────────────
  callLog.processing_status = 'COMPLETED';
  callLog.error = undefined;
  await callLog.save();

  emit(io, 'pipeline:end', {
    callId,
    status:     'COMPLETED',
    governance: governanceResult.status,
    intent:     aiResult.intent,
  });

  logger.info('Pipeline complete', { callId, governance: governanceResult.status });
  return callLog;
}

module.exports = { runPipeline };
