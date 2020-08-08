// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /product/:sku
 */
router.get('/:sku', controller.info);

/**
 * GET /product/:sku/price_picture
 */
router.get('/:sku/price_picture', controller.price_picture);

/**
 * PUT /product/:sku/price_qty_weight
 */
router.put('/:sku/price_qty_weight', controller.update_price_qty_weight);

/**
 * PUT /product/:sku/quantity
 */
router.put('/:sku/quantity', controller.quantity);

/**
 * PUT /product/:sku/increase_quantity
 */
router.put('/:sku/increase_quantity', controller.increase_quantity);

/**
 * PUT /product/:sku/decrease_quantity
 */
router.put('/:sku/decrease_quantity', controller.decrease_quantity);

/**
 * PUT /product/:sku/barcode
 */
router.put('/:sku/barcode', controller.barcode);

/**
 * PUT /product/:sku/weight
 */
router.put('/:sku/weight', controller.weight);

module.exports = router;
