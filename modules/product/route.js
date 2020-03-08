// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /product/:soft_code/price_picture
 */
router.get('/:soft_code/price_picture', controller.price_picture);

/**
 * PUT /product/:soft_code/price_qty_weight
 */
router.put('/:soft_code/price_qty_weight', controller.update_price_qty_weight);

/**
 * PUT /product/:soft_code/increase_quantity
 */
router.put('/:soft_code/increase_quantity', controller.increase_quantity);

module.exports = router;
