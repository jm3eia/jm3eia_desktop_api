// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * PUT /product/:soft_code
 */
router.put('/:soft_code/price_qty_weight', controller.update_price_qty_weight);

module.exports = router;
