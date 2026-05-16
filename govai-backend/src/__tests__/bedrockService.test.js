// src/__tests__/bedrockService.test.js
// Tests for the Bedrock NLP service (runs in mock mode — no AWS needed).

// Force mock mode for tests
process.env.USE_MOCK_AWS = 'true';

const { analyzeTranscript } = require('../services/bedrockService');

describe('Bedrock Service (mock mode)', () => {

  test('returns valid structure for address change transcript', async () => {
    const transcript = 'I need to change the delivery address for order 88234 to Dubai Marina.';
    const result = await analyzeTranscript(transcript);

    expect(result).toHaveProperty('intent');
    expect(result).toHaveProperty('entities');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('urgency');

    expect(result.intent).toBe('CHANGE_ADDRESS');
    expect(result.entities.order_id).toBe('88234');
    expect(result.confidence).toBeGreaterThan(80);
  });

  test('detects REFUND_REQUEST intent', async () => {
    const transcript = 'I want a refund for order 77891. I was charged twice!';
    const result = await analyzeTranscript(transcript);
    expect(result.intent).toBe('REFUND_REQUEST');
    expect(result.sentiment).toBe('NEGATIVE');
  });

  test('detects COMPLAINT with negative sentiment', async () => {
    const transcript = 'This is ridiculous. I want to sue your company!';
    const result = await analyzeTranscript(transcript);
    expect(result.intent).toBe('COMPLAINT');
    expect(result.sentiment).toBe('NEGATIVE');
    expect(result.urgency).toBe('HIGH');
  });

  test('handles empty transcript gracefully', async () => {
    const result = await analyzeTranscript('');
    expect(result.intent).toBe('UNKNOWN');
    expect(result.confidence).toBe(0);
  });

  test('extracts phone number from transcript', async () => {
    const transcript = 'My phone number is 050-123-4567 for order 12345';
    const result = await analyzeTranscript(transcript);
    expect(result.entities.phone).toBeTruthy();
    expect(result.entities.phone).toContain('050');
  });

  test('extracts email from transcript', async () => {
    const transcript = 'Please email me at customer@example.com regarding order 55555';
    const result = await analyzeTranscript(transcript);
    expect(result.entities.email).toBe('customer@example.com');
  });
});
