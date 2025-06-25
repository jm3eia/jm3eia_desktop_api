// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /order
 */
router.get('/', controller.list);

/**
 * GET /order/remote_requests
 */
router.get('/remote_requests', controller.get_remote_requests);

/**
 * GET /order/
 */
router.get('/configured', controller.getConfiguredOrders);

router.get('/prepared', controller.get_prepared_orders);

/**
 * GET /order/driver
 */
router.get('/driver', controller.listDriverOrders);

/**
 * GET /order/completed
 */
router.get('/completed', controller.completed);

/**
 * GET /order/delivering
 */
router.get('/delivering', controller.getDeliveringOrder);

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
router.get('/:Id/mobile', controller.listByPhoneNumber);

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
 * PUT /order/all_statuses
 */
router.put('/all_statuses', controller.update_all_statuses);

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

router.put('/:Id/delivery_time_only', controller.update_delivery_time_only);

/**
 * PUT /order/:Id/address
 */
router.put('/:Id/address', controller.update_address);

/**
 * DELETE /order/:Id/product
 */
router.delete('/:Id/product/:soft_code', controller.delete_product);

/**
 * PUT /order/:Id/product
 */
router.put('/:Id/product/:soft_code', controller.update_product_quantity);

/**
 * PUT /order/:Id/product
 */
router.post('/:Id/product', controller.add_product);

/**
 * PUT /order/status/report
 */
router.get('/status/report', controller.status_report);


router.patch('/make_inserted', controller.make_orders_inserted);

module.exports = router;

