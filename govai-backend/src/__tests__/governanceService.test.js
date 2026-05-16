// src/__tests__/governanceService.test.js
// Unit tests for the Governance Rules Engine.
// Run with: npm test

const { evaluateGovernance, maskSensitiveData } = require('../services/governanceService');

describe('Governance Service', () => {

  // ── Status decisions ──────────────────────────────────────
  describe('evaluateGovernance — status', () => {

    test('APPROVED: high confidence, order present, no abuse', () => {
      const ai = {
        intent:     'DELIVERY_ENQUIRY',
        entities:   { order_id: '88234' },
        confidence: 92,
        urgency:    'LOW',
      };
      const result = evaluateGovernance(ai, 'Where is my order 88234?');
      expect(result.status).toBe('APPROVED');
      expect(result.governance_score).toBeGreaterThanOrEqual(90);
      expect(result.flags).not.toContain('LOW_CONFIDENCE');
    });

    test('REVIEW_REQUIRED: low confidence', () => {
      const ai = {
        intent:     'CHANGE_ADDRESS',
        entities:   { order_id: '12345', new_address: 'Dubai Marina' },
        confidence: 60,
        urgency:    'MEDIUM',
      };
      const result = evaluateGovernance(ai, 'Please update my address for order 12345 to Dubai Marina');
      expect(result.status).toBe('REVIEW_REQUIRED');
      expect(result.flags).toContain('LOW_CONFIDENCE');
    });

    test('REVIEW_REQUIRED: missing order ID for REFUND_REQUEST', () => {
      const ai = {
        intent:     'REFUND_REQUEST',
        entities:   {},
        confidence: 88,
        urgency:    'HIGH',
      };
      const result = evaluateGovernance(ai, 'I want my money back');
      expect(result.status).toBe('REVIEW_REQUIRED');
      expect(result.flags).toContain('MISSING_ORDER_ID');
    });

    test('BLOCKED: abusive language detected', () => {
      const ai = {
        intent:     'COMPLAINT',
        entities:   {},
        confidence: 95,
        urgency:    'HIGH',
      };
      const transcript = 'This is complete garbage and your company is a scam!';
      const result = evaluateGovernance(ai, transcript);
      expect(result.status).toBe('BLOCKED');
      expect(result.flags).toContain('ABUSE_DETECTED');
      expect(result.governance_score).toBeLessThan(60);
    });

    test('REVIEW_REQUIRED: legal threat detected', () => {
      const ai = {
        intent:     'COMPLAINT',
        entities:   { order_id: '99999' },
        confidence: 90,
        urgency:    'HIGH',
      };
      const transcript = 'My lawyer will be contacting you about this.';
      const result = evaluateGovernance(ai, transcript);
      expect(result.flags).toContain('LEGAL_THREAT');
      expect(result.status).toBe('REVIEW_REQUIRED');
    });
  });

  // ── PII masking ───────────────────────────────────────────
  describe('maskSensitiveData', () => {

    test('masks phone numbers', () => {
      const { masked } = maskSensitiveData('Call me on 050-123-4567 please');
      expect(masked).not.toContain('050-123-4567');
      expect(masked).toContain('[PHONE REDACTED]');
    });

    test('masks email addresses', () => {
      const { masked } = maskSensitiveData('Email me at john@example.com');
      expect(masked).not.toContain('john@example.com');
      expect(masked).toContain('[EMAIL REDACTED]');
    });

    test('returns original text when no PII present', () => {
      const clean = 'Please check order status for order 12345';
      const { masked, didMask } = maskSensitiveData(clean);
      expect(didMask).toBe(false);
      expect(masked).toBe(clean);
    });

    test('masks multiple PII types in one string', () => {
      const text = 'My number is 050-999-8888 and email is test@domain.com';
      const { masked, didMask } = maskSensitiveData(text);
      expect(didMask).toBe(true);
      expect(masked).not.toContain('050-999-8888');
      expect(masked).not.toContain('test@domain.com');
    });
  });

  // ── Score calculation ─────────────────────────────────────
  describe('governance_score', () => {
    test('is 100 for a perfect call', () => {
      const ai = { intent: 'COMPLIMENT', entities: {}, confidence: 99, urgency: 'LOW' };
      const result = evaluateGovernance(ai, 'You all are amazing!');
      expect(result.governance_score).toBe(100);
    });

    test('is capped at 0 for extremely bad calls', () => {
      const ai = { intent: 'COMPLAINT', entities: {}, confidence: 10, urgency: 'HIGH' };
      const transcript = 'You are garbage idiots and I will sue this scam company';
      const result = evaluateGovernance(ai, transcript);
      expect(result.governance_score).toBeGreaterThanOrEqual(0);
    });
  });
});
