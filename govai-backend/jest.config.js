// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/controllers/**/*.js',
    'src/utils/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageThreshold: {
    global: { lines: 70 },
  },
  // Don't try to connect to real MongoDB in tests
  setupFiles: ['./src/__tests__/setup.js'],
};
