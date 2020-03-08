// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /product/:soft_code/
 */
router.get('/:soft_code/price_picture', controller.price_picture);

/**
 * PUT /product/:soft_code
 */
router.put('/:soft_code/price_qty_weight', controller.update_price_qty_weight);

module.exports = router;
