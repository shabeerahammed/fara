// src/models/CallLog.js
// Mongoose schema for a processed call.
// One document = one call audio file run through the full pipeline.

const mongoose = require('mongoose');

// ─── Sub-schemas ────────────────────────────────────────────
const AIResultSchema = new mongoose.Schema({
  intent:     { type: String, default: 'UNKNOWN' },
  entities:   { type: mongoose.Schema.Types.Mixed, default: {} },
  summary:    { type: String, default: '' },
  confidence: { type: Number, min: 0, max: 100, default: 0 },
  raw:        { type: String, select: false }, // raw Bedrock response, hidden by default
}, { _id: false });

const GovernanceResultSchema = new mongoose.Schema({
  status:           { type: String, enum: ['APPROVED', 'REVIEW_REQUIRED', 'BLOCKED'], default: 'REVIEW_REQUIRED' },
  governance_score: { type: Number, min: 0, max: 100, default: 0 },
  flags:            { type: [String], default: [] },
  masked_transcript:{ type: String, default: '' },
}, { _id: false });

const DeliverySchema = new mongoose.Schema({
  status:       { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'BLOCKED'], default: 'PENDING' },
  webhook_sent: { type: Boolean, default: false },
  sent_at:      { type: Date },
  response:     { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const PipelineStageSchema = new mongoose.Schema({
  stage:  { type: String }, // 'UPLOAD' | 'TRANSCRIBE' | 'AI' | 'GOVERNANCE' | 'DELIVERY'
  status: { type: String }, // 'SUCCESS' | 'FAILED' | 'SKIPPED'
  message:{ type: String },
  duration_ms: { type: Number },
  completed_at:{ type: Date },
}, { _id: false });

// ─── Main schema ─────────────────────────────────────────────
const CallLogSchema = new mongoose.Schema(
  {
    call_id:      { type: String, required: true, unique: true, index: true },
    agent_id:     { type: String, default: 'UNASSIGNED' },
    customer_id:  { type: String, default: '' },
    audio_url:    { type: String, required: true },
    audio_key:    { type: String },  // S3 object key
    file_name:    { type: String },
    file_size:    { type: Number },  // bytes
    duration_secs:{ type: Number },

    // Pipeline stages
    transcript:       { type: String, default: '' },
    transcribe_job:   { type: String },  // AWS Transcribe job name
    transcribe_status:{ type: String, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'], default: 'PENDING' },

    ai_result:        { type: AIResultSchema,         default: () => ({}) },
    governance_result:{ type: GovernanceResultSchema, default: () => ({}) },
    delivery:         { type: DeliverySchema,         default: () => ({}) },

    // Processing timeline
    pipeline_stages:  { type: [PipelineStageSchema], default: [] },
    processing_status:{ type: String, enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'], default: 'QUEUED' },
    error:            { type: String }, // last error message if failed
  },
  {
    timestamps: true,           // adds createdAt / updatedAt
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// Virtual: human-readable processing time
CallLogSchema.virtual('processing_time').get(function () {
  if (this.updatedAt && this.createdAt) {
    return `${((this.updatedAt - this.createdAt) / 1000).toFixed(1)}s`;
  }
  return null;
});

// Index for dashboard queries
CallLogSchema.index({ createdAt: -1 });
CallLogSchema.index({ 'governance_result.status': 1 });
CallLogSchema.index({ processing_status: 1 });

module.exports = mongoose.model('CallLog', CallLogSchema);
