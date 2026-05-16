// src/__tests__/setup.js
// Run before every test file. Sets mock-safe environment variables.

process.env.NODE_ENV      = 'test';
process.env.USE_MOCK_AWS  = 'true';
process.env.MONGODB_URI   = 'mongodb://localhost:27017/govai_test';
process.env.PORT          = '5001';

// Silence Winston logs during tests to keep output clean
process.env.LOG_LEVEL = 'silent';
