// src/controllers/deliveryController.js
// Handles /api/delivery/* routes.

const DeliveryOrder       = require('../models/DeliveryOrder');
const { updateDeliveryOrder } = require('../services/deliveryService');
const ApiResponse         = require('../utils/apiResponse');
const logger              = require('../utils/logger');
const { v4: uuidv4 }      = require('uuid');

// ─── POST /api/delivery/create ────────────────────────────────
async function createOrder(req, res) {
  try {
    const {
      order_id = `MAN-${uuidv4().slice(0, 8).toUpperCase()}`,
      call_id, customer_id, intent = 'OTHER',
      delivery_address, contact_number, notes, items = [],
    } = req.body;

    const existing = await DeliveryOrder.findOne({ order_id });
    if (existing) {
      return ApiResponse.badRequest(res, `Order ${order_id} already exists. Use PUT /api/delivery/update.`);
    }

    const order = await DeliveryOrder.create({
      order_id, call_id, customer_id, intent,
      delivery_address, contact_number, notes, items,
      history: [{ status: 'PENDING', changed_by: 'API', note: 'Manually created' }],
    });

    logger.info('DeliveryOrder created', { order_id });
    return ApiResponse.created(res, order, 'Delivery order created');
  } catch (err) {
    logger.error('Create order failed', { error: err.message });
    return ApiResponse.error(res, 'Failed to create order', err);
  }
}

// ─── PUT /api/delivery/update ─────────────────────────────────
async function updateOrder(req, res) {
  try {
    const { order_id, status, delivery_address, contact_number, notes, updated_by } = req.body;
    if (!order_id) return ApiResponse.badRequest(res, 'order_id is required');

    const order = await updateDeliveryOrder(
      order_id,
      { status, delivery_address, contact_number, notes },
      updated_by || 'API'
    );

    logger.info('DeliveryOrder updated', { order_id, status });
    return ApiResponse.success(res, order, 'Delivery order updated');
  } catch (err) {
    if (err.message.startsWith('Order not found')) return ApiResponse.notFound(res, err.message);
    return ApiResponse.error(res, 'Failed to update order', err);
  }
}

// ─── GET /api/delivery/orders ────────────────────────────────
async function getOrders(req, res) {
  try {
    const { status, flagged, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)  filter.status  = status;
    if (flagged) filter.flagged = flagged === 'true';

    const skip  = (parseInt(page, 10) - 1) * Math.min(parseInt(limit, 10), 100);
    const lim   = Math.min(parseInt(limit, 10), 100);
    const total = await DeliveryOrder.countDocuments(filter);
    const orders = await DeliveryOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(lim)
      .select('-history -__v');

    return ApiResponse.success(res, {
      orders,
      pagination: { page: parseInt(page, 10), limit: lim, total, pages: Math.ceil(total / lim) },
    });
  } catch (err) {
    return ApiResponse.error(res, 'Failed to retrieve orders', err);
  }
}

module.exports = { createOrder, updateOrder, getOrders };
