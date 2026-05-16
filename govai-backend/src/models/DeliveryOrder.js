// src/models/DeliveryOrder.js
// Tracks delivery orders created or updated from processed calls.

const mongoose = require('mongoose');

const DeliveryOrderSchema = new mongoose.Schema(
  {
    order_id:       { type: String, required: true, unique: true, index: true },
    call_id:        { type: String, index: true },
    customer_id:    { type: String },
    intent:         { type: String },  // mirrored from AI result

    // Order fields extracted from call
    items:          { type: mongoose.Schema.Types.Mixed, default: [] },
    delivery_address:{ type: String },
    contact_number: { type: String },  // masked version
    notes:          { type: String },

    // Status lifecycle: PENDING → PROCESSING → SHIPPED → DELIVERED | CANCELLED
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'],
      default: 'PENDING',
    },

    // Governance link
    governance_status: { type: String },
    flagged:           { type: Boolean, default: false },

    // Audit
    updated_by:  { type: String, default: 'SYSTEM' },
    history: [{
      status:     String,
      changed_by: String,
      note:       String,
      changed_at: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryOrder', DeliveryOrderSchema);
