// src/routes/health.js
// Lightweight health-check endpoint for load balancers / container probes.

const express  = require('express');
const mongoose = require('mongoose');
const config   = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

  res.status(dbState === 1 ? 200 : 503).json({
    status:    dbState === 1 ? 'healthy' : 'degraded',
    service:   'govai-backend',
    version:   '1.0.0',
    env:       config.server.env,
    mockMode:  config.useMockAws,
    db:        dbStatus,
    uptime:    `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
