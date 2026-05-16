// src/services/deliveryService.js
// Sends structured call output to the downstream delivery system webhook.
// In mock mode, simulates a successful delivery API response.

const axios  = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { withRetry } = require('../utils/retry');
const DeliveryOrder = require('../models/DeliveryOrder');
const { v4: uuidv4 } = require('uuid');

// ─── Mock delivery ────────────────────────────────────────────
async function mockSend(payload) {
  logger.debug('[MOCK Delivery] Simulating webhook delivery', { callId: payload.callId });
  await new Promise(r => setTimeout(r, 400));

  return {
    delivery_id:  `DEL-${uuidv4().slice(0, 8).toUpperCase()}`,
    accepted:     payload.governanceStatus !== 'BLOCKED',
    message:      'Delivery system acknowledged',
    mock:         true,
    received_at:  new Date().toISOString(),
  };
}

// ─── Service API ─────────────────────────────────────────────

/**
 * Send processed call payload to the delivery system.
 * Also creates / updates a DeliveryOrder document in MongoDB.
 *
 * @param {object} payload  - Structured call output
 * @returns {object}        - Delivery system acknowledgement
 */
async function sendToDelivery(payload) {
  const {
    callId, intent, entities = {}, governanceStatus,
    governanceScore, flags, summary
  } = payload;

  // Build the delivery system payload
  const deliveryPayload = {
    call_id:          callId,
    intent,
    order_id:         entities.order_id || null,
    delivery_address: entities.new_address || null,
    contact_phone:    entities.phone || null,
    customer_email:   entities.email || null,
    summary,
    governance: {
      status: governanceStatus,
      score:  governanceScore,
      flags,
    },
    timestamp: new Date().toISOString(),
  };

  // Send to webhook
  let response;
  if (config.useMockAws) {
    response = await mockSend(deliveryPayload);
  } else {
    response = await withRetry(
      async () => {
        const res = await axios.post(config.delivery.webhookUrl, deliveryPayload, {
          timeout: 8000,
          headers: { 'Content-Type': 'application/json', 'X-Source': 'govai-backend' },
        });
        return res.data;
      },
      config.retry.maxRetries,
      config.retry.delayMs,
      'Delivery webhook'
    );
  }

  // Persist as a DeliveryOrder document
  try {
    const orderId = entities.order_id || `AUTO-${uuidv4().slice(0, 8).toUpperCase()}`;
    await DeliveryOrder.findOneAndUpdate(
      { order_id: orderId },
      {
        order_id:         orderId,
        call_id:          callId,
        intent,
        delivery_address: entities.new_address || null,
        contact_number:   entities.phone || null,
        notes:            summary,
        governance_status: governanceStatus,
        flagged:          flags?.length > 0,
        status:           governanceStatus === 'APPROVED' ? 'PENDING' : 'PROCESSING',
        $push: {
          history: {
            status:     governanceStatus === 'APPROVED' ? 'PENDING' : 'PROCESSING',
            changed_by: 'SYSTEM',
            note:       `Auto-created from call ${callId}. Intent: ${intent}`,
          },
        },
      },
      { upsert: true, new: true }
    );
    logger.info('DeliveryOrder upserted', { orderId, callId });
  } catch (err) {
    // Non-fatal — we still return the delivery webhook response
    logger.error('Failed to persist DeliveryOrder', { callId, error: err.message });
  }

  logger.info('Delivery sent', { callId, deliveryId: response.delivery_id });
  return response;
}

/**
 * Update a delivery order status (from the PUT /api/delivery/update endpoint).
 */
async function updateDeliveryOrder(orderId, updates, updatedBy = 'API') {
  const order = await DeliveryOrder.findOne({ order_id: orderId });
  if (!order) throw new Error(`Order not found: ${orderId}`);

  const prevStatus = order.status;
  Object.assign(order, updates);
  order.updated_by = updatedBy;

  if (updates.status && updates.status !== prevStatus) {
    order.history.push({
      status:     updates.status,
      changed_by: updatedBy,
      note:       updates.note || 'Status updated via API',
    });
  }

  await order.save();
  return order;
}

module.exports = { sendToDelivery, updateDeliveryOrder };
