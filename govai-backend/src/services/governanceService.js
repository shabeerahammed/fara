// src/services/governanceService.js
// ─────────────────────────────────────────────────────────────
// The AI Governance Rules Engine
//
// Evaluates every processed call against a set of governance rules.
// Returns a structured decision object:
// {
//   status:           'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED',
//   governance_score: 0-100,
//   flags:            string[],
//   masked_transcript: string,
// }
// ─────────────────────────────────────────────────────────────

const config = require('../config');
const logger = require('../utils/logger');

// ─── Constants ───────────────────────────────────────────────
const FLAGS = {
  LOW_CONFIDENCE:   'LOW_CONFIDENCE',
  MISSING_ORDER_ID: 'MISSING_ORDER_ID',
  ABUSE_DETECTED:   'ABUSE_DETECTED',
  SENSITIVE_DATA:   'SENSITIVE_DATA_MASKED',
  LEGAL_THREAT:     'LEGAL_THREAT',
  HIGH_URGENCY:     'HIGH_URGENCY',
  UNKNOWN_INTENT:   'UNKNOWN_INTENT',
};

// Words that trigger BLOCKED status
const ABUSIVE_TERMS = [
  'garbage', 'idiot', 'stupid', 'moron', 'scam', 'fraud',
  'hate', 'damn', 'hell', 'crap', 'bullshit', 'bs',
  'ridiculous', 'incompetent', 'useless',
];

// Legal threat keywords
const LEGAL_TERMS = [
  'sue', 'lawsuit', 'court', 'lawyer', 'attorney',
  'legal action', 'consumer authority', 'file a complaint',
];

// PII masking patterns
const MASK_PATTERNS = [
  // Phone numbers (various formats)
  { pattern: /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, label: '[PHONE REDACTED]' },
  // Email addresses
  { pattern: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi, label: '[EMAIL REDACTED]' },
  // Credit card numbers (basic: 13-16 digits, possibly spaced)
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{0,4}\b/g, label: '[CARD REDACTED]' },
  // UAE/international addresses (simplified)
  { pattern: /\b\d{1,5}\s[\w\s,]{3,50}(?:road|street|avenue|tower|marina|jumeirah|dubai|abu dhabi|sharjah)\b/gi, label: '[ADDRESS REDACTED]' },
];

// ─── Individual rule evaluators ──────────────────────────────

/** Rule 1: Confidence threshold */
function checkConfidence(aiResult, flags, scoreDeductions) {
  const { confidence } = aiResult;
  const threshold = config.governance.confidenceThreshold;

  if (confidence < threshold) {
    flags.push(FLAGS.LOW_CONFIDENCE);
    const penalty = Math.round((threshold - confidence) * 0.5);
    scoreDeductions.push({ rule: 'LOW_CONFIDENCE', penalty });
    logger.debug('Governance: low confidence', { confidence, threshold });
    return false; // requires review
  }
  return true;
}

/** Rule 2: Missing order ID for relevant intents */
function checkOrderId(aiResult, flags, scoreDeductions) {
  const intentsRequiringOrder = ['CHANGE_ADDRESS', 'REFUND_REQUEST', 'DELIVERY_ENQUIRY', 'CANCELLATION'];
  if (
    intentsRequiringOrder.includes(aiResult.intent) &&
    (!aiResult.entities?.order_id || aiResult.entities.order_id.trim() === '')
  ) {
    flags.push(FLAGS.MISSING_ORDER_ID);
    scoreDeductions.push({ rule: 'MISSING_ORDER_ID', penalty: 15 });
    logger.debug('Governance: missing order ID', { intent: aiResult.intent });
    return false;
  }
  return true;
}

/** Rule 3: Abusive language detection → BLOCKED */
function checkAbuse(transcript, flags, scoreDeductions) {
  const lower = transcript.toLowerCase();
  const found = ABUSIVE_TERMS.filter(term => lower.includes(term));
  if (found.length > 0) {
    flags.push(FLAGS.ABUSE_DETECTED);
    scoreDeductions.push({ rule: 'ABUSE_DETECTED', penalty: 50 });
    logger.warn('Governance: abusive language detected', { terms: found });
    return true; // blocked
  }
  return false;
}

/** Rule 4: Legal threat detection */
function checkLegalThreat(transcript, flags, scoreDeductions) {
  const lower = transcript.toLowerCase();
  const found = LEGAL_TERMS.filter(term => lower.includes(term));
  if (found.length > 0) {
    flags.push(FLAGS.LEGAL_THREAT);
    scoreDeductions.push({ rule: 'LEGAL_THREAT', penalty: 30 });
    logger.warn('Governance: legal threat detected', { terms: found });
  }
}

/** Rule 5: Unknown intent */
function checkIntent(aiResult, flags, scoreDeductions) {
  if (aiResult.intent === 'UNKNOWN' || aiResult.intent === 'OTHER') {
    flags.push(FLAGS.UNKNOWN_INTENT);
    scoreDeductions.push({ rule: 'UNKNOWN_INTENT', penalty: 10 });
  }
}

/** Rule 6: High urgency marker */
function checkUrgency(aiResult, flags) {
  if (aiResult.urgency === 'HIGH') {
    flags.push(FLAGS.HIGH_URGENCY);
  }
}

// ─── PII Masker ───────────────────────────────────────────────

/**
 * Mask all PII patterns in a transcript.
 * @param {string} transcript
 * @returns {string} masked text
 */
function maskSensitiveData(transcript) {
  let masked = transcript;
  let didMask = false;

  for (const { pattern, label } of MASK_PATTERNS) {
    const before = masked;
    masked = masked.replace(pattern, label);
    if (masked !== before) didMask = true;
  }

  return { masked, didMask };
}

// ─── Main governance evaluator ────────────────────────────────

/**
 * Run all governance rules against a call's AI output and transcript.
 *
 * @param {object} aiResult   - Output from bedrockService.analyzeTranscript
 * @param {string} transcript - Raw transcript text
 * @returns {{status, governance_score, flags, masked_transcript}}
 */
function evaluateGovernance(aiResult, transcript = '') {
  const flags = [];
  const scoreDeductions = [];
  let blocked = false;
  let requiresReview = false;

  // ── Run all rules ──
  const abuseDetected    = checkAbuse(transcript, flags, scoreDeductions);
  const confidenceOk     = checkConfidence(aiResult, flags, scoreDeductions);
  const orderOk          = checkOrderId(aiResult, flags, scoreDeductions);
  checkLegalThreat(transcript, flags, scoreDeductions);
  checkIntent(aiResult, flags, scoreDeductions);
  checkUrgency(aiResult, flags);

  // ── PII masking ──
  const { masked: masked_transcript, didMask } = maskSensitiveData(transcript);
  if (didMask) flags.push(FLAGS.SENSITIVE_DATA);

  // ── Determine status ──
  if (abuseDetected) {
    blocked = true;
  } else if (!confidenceOk || !orderOk || flags.includes(FLAGS.LEGAL_THREAT)) {
    requiresReview = true;
  }

  // ── Score calculation ──
  const totalPenalty = scoreDeductions.reduce((s, d) => s + d.penalty, 0);
  const governance_score = Math.max(0, Math.min(100, 100 - totalPenalty));

  const status = blocked
    ? 'BLOCKED'
    : requiresReview
    ? 'REVIEW_REQUIRED'
    : 'APPROVED';

  const result = {
    status,
    governance_score,
    flags: [...new Set(flags)], // deduplicate
    masked_transcript,
    rules_applied: scoreDeductions,
  };

  logger.info('Governance evaluation complete', {
    status,
    governance_score,
    flags: result.flags,
    intent: aiResult.intent,
  });

  return result;
}

module.exports = { evaluateGovernance, maskSensitiveData };
