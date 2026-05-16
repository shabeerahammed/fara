// src/routes/delivery.js
const express = require('express');
const { createOrder, updateOrder, getOrders } = require('../controllers/deliveryController');

const router = express.Router();

/**
 * @route  POST /api/delivery/create
 * @desc   Manually create a delivery order
 * @body   { order_id?, call_id, customer_id, delivery_address, contact_number, notes, items }
 */
router.post('/create', createOrder);

/**
 * @route  PUT /api/delivery/update
 * @desc   Update a delivery order status or details
 * @body   { order_id, status?, delivery_address?, contact_number?, notes?, updated_by? }
 */
router.put('/update', updateOrder);

/**
 * @route  GET /api/delivery/orders
 * @desc   Paginated delivery order list
 * @query  status, flagged, page, limit
 */
router.get('/orders', getOrders);

module.exports = router;
