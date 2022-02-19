// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /product/:soft_code
 */
router.get('/:soft_code', controller.info);

/**
 * GET /product/:soft_code/price_picture
 */
router.get('/:soft_code/price_picture', controller.price_picture);

/**
 * PUT /product/:soft_code/price_qty_weight
 */
router.put('/:soft_code/price_qty_weight', controller.update_price_qty_weight);

/**
 * PUT /product/:soft_code/quantity
 */
router.put('/:soft_code/quantity', controller.quantity);

/**
 * PUT /product/:soft_code/increase_quantity
 */
router.put('/:soft_code/increase_quantity', controller.increase_quantity);

/**
 * PUT /product/:soft_code/decrease_quantity
 */
router.put('/:soft_code/decrease_quantity', controller.decrease_quantity);

/**
 * PUT /product/:soft_code/barcode
 */
router.put('/:soft_code/barcode', controller.barcode);

/**
 * PUT /product/:soft_code/weight
 */
router.put('/:soft_code/weight', controller.weight);

/**
 * POST /product/update_status
 */
router.put('/update_status', controller.update_status);

module.exports = router;
