// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /order
 */
router.get('/', controller.list);

/**
 * GET /order/driver
 */
router.get('/driver', controller.listDriverOrders);

/**
 * GET /order/:Id
 */
router.get('/:Id', controller.read);

/**
 * GET /order/:Id/order_id
 */
router.get('/:Id/order_id', controller.read);

/**
 * GET /order/:Id/number
 */
router.get('/:Id/number', controller.readByOrderNumber);

/**
 * GET /order/:Id/number
 */
router.get('/:Id/status', controller.status);

/**
 * PUT /order/:Id/refund
 */
router.put('/:Id/refund', controller.refundToWallet);

/**
 * PUT /order/:Id/status
 */
router.put('/:Id/number', controller.update_order_number);

/**
 * PUT /order/:Id/status
 */
router.put('/:Id/status', controller.update_status);

/**
 * Post /order/:Id/driver_details
 */
router.post('/:Id/driver_details', controller.update_driver_details);

/**
 * PUT /order/:Id/driver_details/remove
 */
router.put('/:Id/driver_details/remove', controller.remove_driver_details);

/**
 * PUT /order/:Id/delivery_time
 */
router.put('/:Id/delivery_time', controller.update_delivery_time);

/**
 * DELETE /order/:Id/product
 */
router.delete('/:Id/product/:soft_code', controller.delete_product);

/**
 * PUT /order/:Id/product
 */
router.put('/:Id/product/:soft_code', controller.update_product_quantity);

/**
 * PUT /order/status/report
 */
router.get('/status/report', controller.status_report);


module.exports = router;
