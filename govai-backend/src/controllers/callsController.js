// src/controllers/callsController.js
// Handles all /api/calls/* routes.

const { v4: uuidv4 }    = require('uuid');
const { uploadAudio }   = require('../services/s3Service');
const { runPipeline }   = require('../services/pipelineService');
const CallLog           = require('../models/CallLog');
const ApiResponse       = require('../utils/apiResponse');
const logger            = require('../utils/logger');

// ─── POST /api/calls/upload ──────────────────────────────────
/**
 * Step 1: Receive audio file, store in S3, create CallLog record.
 * Returns immediately — processing is async via /process or auto-triggered.
 */
async function uploadCall(req, res) {
  try {
    if (!req.file) {
      return ApiResponse.badRequest(res, 'No audio file provided. Send file in field "audio".');
    }

    const { agent_id = 'UNKNOWN', customer_id = '', auto_process = 'false' } = req.body;
    const callId = uuidv4();

    // Upload to S3
    const { key, url } = await uploadAudio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Create CallLog record
    const callLog = await CallLog.create({
      call_id:    callId,
      agent_id,
      customer_id,
      audio_url:  url,
      audio_key:  key,
      file_name:  req.file.originalname,
      file_size:  req.file.size,
      pipeline_stages: [{
        stage:        'UPLOAD',
        status:       'SUCCESS',
        message:      `Stored as ${key}`,
        duration_ms:  0,
        completed_at: new Date(),
      }],
    });

    logger.info('Call uploaded', { callId, agent_id, key });

    // Optionally kick off full pipeline immediately
    if (auto_process === 'true') {
      const io = req.app.get('io');
      // Fire-and-forget — don't await (let the client poll or use WebSocket)
      setImmediate(() => runPipeline(callId, key, io));
    }

    return ApiResponse.created(res, {
      call_id:      callId,
      audio_url:    url,
      audio_key:    key,
      status:       'QUEUED',
      auto_process: auto_process === 'true',
      message:      auto_process === 'true'
        ? 'Processing started. Listen on WebSocket for progress.'
        : 'Upload complete. POST /api/calls/process to begin pipeline.',
    }, 'Audio uploaded successfully');
  } catch (err) {
    logger.error('Upload failed', { error: err.message });
    return ApiResponse.error(res, 'Upload failed', err);
  }
}

// ─── POST /api/calls/process ─────────────────────────────────
/**
 * Step 2: Run the full pipeline for a previously uploaded call.
 * Body: { call_id }
 * Runs async — returns immediately with status PROCESSING.
 * Client uses WebSocket to receive pipeline:stage events.
 */
async function processCall(req, res) {
  try {
    const { call_id } = req.body;
    if (!call_id) return ApiResponse.badRequest(res, 'call_id is required');

    const callLog = await CallLog.findOne({ call_id });
    if (!callLog) return ApiResponse.notFound(res, `Call not found: ${call_id}`);

    if (callLog.processing_status === 'PROCESSING') {
      return ApiResponse.badRequest(res, 'Call is already being processed');
    }
    if (callLog.processing_status === 'COMPLETED') {
      return ApiResponse.badRequest(res, 'Call already processed. Retrieve results via /api/calls/logs');
    }

    const io = req.app.get('io');

    // Async pipeline — don't block the HTTP response
    setImmediate(() => runPipeline(call_id, callLog.audio_key, io));

    return ApiResponse.success(res, {
      call_id,
      processing_status: 'PROCESSING',
      message: 'Pipeline started. Connect to WebSocket for real-time updates.',
      websocket_events: ['pipeline:start', 'pipeline:stage', 'pipeline:end'],
    }, 'Processing started');
  } catch (err) {
    logger.error('Process trigger failed', { error: err.message });
    return ApiResponse.error(res, 'Failed to start processing', err);
  }
}

// ─── GET /api/calls/logs ─────────────────────────────────────
/**
 * Retrieve processed call logs with optional filtering and pagination.
 * Query params:
 *   status      - processing_status filter
 *   governance  - governance_result.status filter (APPROVED|REVIEW_REQUIRED|BLOCKED)
 *   agent_id    - filter by agent
 *   page        - page number (default 1)
 *   limit       - results per page (default 20, max 100)
 */
async function getCallLogs(req, res) {
  try {
    const {
      status, governance, agent_id,
      page  = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (status)     filter.processing_status         = status;
    if (governance) filter['governance_result.status'] = governance;
    if (agent_id)   filter.agent_id                  = agent_id;

    const skip   = (parseInt(page, 10) - 1) * Math.min(parseInt(limit, 10), 100);
    const lim    = Math.min(parseInt(limit, 10), 100);
    const total  = await CallLog.countDocuments(filter);
    const logs   = await CallLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .select('-pipeline_stages -__v'); // trim payload size

    return ApiResponse.success(res, {
      logs,
      pagination: {
        page:  parseInt(page, 10),
        limit: lim,
        total,
        pages: Math.ceil(total / lim),
      },
    }, `Retrieved ${logs.length} call logs`);
  } catch (err) {
    logger.error('Get logs failed', { error: err.message });
    return ApiResponse.error(res, 'Failed to retrieve logs', err);
  }
}

// ─── GET /api/calls/:callId ──────────────────────────────────
/**
 * Get a single call log with full pipeline stage detail.
 */
async function getCallById(req, res) {
  try {
    const callLog = await CallLog.findOne({ call_id: req.params.callId });
    if (!callLog) return ApiResponse.notFound(res, `Call not found: ${req.params.callId}`);
    return ApiResponse.success(res, callLog);
  } catch (err) {
    return ApiResponse.error(res, 'Failed to retrieve call', err);
  }
}

// ─── GET /api/calls/stats ─────────────────────────────────────
/**
 * Aggregate summary statistics and chart data for the dashboard.
 */
async function getCallStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Summary Stats
    const stats = await CallLog.aggregate([
      {
        $facet: {
          totalCalls:    [{ $count: 'count' }],
          flaggedToday:  [{ $match: { createdAt: { $gte: today }, 'governance_result.status': { $in: ['REVIEW_REQUIRED', 'BLOCKED'] } } }, { $count: 'count' }],
          resolvedToday: [{ $match: { createdAt: { $gte: today }, processing_status: 'COMPLETED' } }, { $count: 'count' }],
          avgConfidence: [{ $group: { _id: null, avg: { $avg: '$ai_result.confidence' } } }],
          pendingReview: [{ $match: { 'governance_result.status': 'REVIEW_REQUIRED' } }, { $count: 'count' }],
        }
      }
    ]);

    const s = stats[0];
    const summary = {
      totalCalls:    s.totalCalls[0]?.count || 0,
      flaggedCalls:  s.flaggedToday[0]?.count || 0,
      avgConfidence: Math.round(s.avgConfidence[0]?.avg || 0),
      resolvedToday: s.resolvedToday[0]?.count || 0,
      activeAgents:  12, // Mock for now
      pendingReview: s.pendingReview[0]?.count || 0,
    };

    // 2. Chart Data: Call Volume (last 12 hours)
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const volumeData = await CallLog.aggregate([
      { $match: { createdAt: { $gte: twelveHoursAgo } } },
      {
        $group: {
          _id: { hour: { $hour: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    const callVolume = volumeData.map(d => ({
      time: `${d._id.hour % 12 || 12}${d._id.hour >= 12 ? 'PM' : 'AM'}`,
      calls: d.count
    }));

    // 3. Chart Data: Agent Performance
    const agentPerf = await CallLog.aggregate([
      {
        $group: {
          _id: '$agent_id',
          score: { $avg: '$governance_result.governance_score' },
          calls: { $sum: 1 }
        }
      },
      { $limit: 5 }
    ]);

    const agentPerformance = agentPerf.map(a => ({
      agent: a._id === 'UNASSIGNED' ? 'Sarah C.' : a._id, // fallback for demo
      score: Math.round(a.score || 0),
      calls: a.calls
    }));

    return ApiResponse.success(res, {
      summary,
      charts: {
        callVolume: callVolume.length > 0 ? callVolume : [{ time: '9AM', calls: 0 }, { time: '10AM', calls: 0 }],
        agentPerformance,
        // Fallbacks for more complex charts if needed empty or mock
        weeklyFlagged: [],
        confidenceDistribution: []
      }
    });
  } catch (err) {
    logger.error('Stats aggregation failed', { error: err.message });
    return ApiResponse.error(res, 'Failed to aggregate statistics', err);
  }
}

module.exports = { uploadCall, processCall, getCallLogs, getCallById, getCallStats };
