// src/config/database.js
// Establishes and manages the MongoDB connection via Mongoose.
// Call connectDB() once on server start.

const mongoose = require('mongoose');
const config   = require('./index');
const logger   = require('../utils/logger');

async function connectDB() {
  try {
    await mongoose.connect(config.db.uri, {
      // These options give the connection pool breathing room
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });
    logger.info('MongoDB connected', { uri: config.db.uri.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    // Exit so the process restarts cleanly (e.g. via PM2 / ECS)
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected',  () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', err    => logger.error('MongoDB error', { error: err.message }));
}

async function disconnectDB() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

module.exports = { connectDB, disconnectDB };
