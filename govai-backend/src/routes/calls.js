// src/routes/calls.js
const express = require('express');
const multer  = require('multer');
const { uploadCall, processCall, getCallLogs, getCallById, getCallStats } = require('../controllers/callsController');

const router = express.Router();

// Multer: store in memory (we stream directly to S3, no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/x-m4a', 'application/octet-stream'];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

/**
 * @route  POST /api/calls/upload
 * @desc   Upload audio file → S3
 * @body   multipart/form-data: audio (file), agent_id, customer_id, auto_process
 */
router.post('/upload', upload.single('audio'), uploadCall);

/**
 * @route  POST /api/calls/process
 * @desc   Trigger full pipeline for an uploaded call
 * @body   { call_id: string }
 */
router.post('/process', processCall);

/**
 * @route  GET /api/calls/logs
 * @desc   Paginated list of call logs
 * @query  status, governance, agent_id, page, limit
 */
router.get('/logs', getCallLogs);

/**
 * @route  GET /api/calls/stats
 * @desc   Dashboard summary stats and chart data
 */
router.get('/stats', getCallStats);

/**
 * @route  GET /api/calls/:callId
 * @desc   Get a single call with full detail
 */
router.get('/:callId', getCallById);

module.exports = router;
