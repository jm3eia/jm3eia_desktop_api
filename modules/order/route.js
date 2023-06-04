// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /order
 */
router.get('/', controller.list);

/**
 * GET /order/:Id
 */
router.get('/:Id', controller.read);

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
module.exports = router;
