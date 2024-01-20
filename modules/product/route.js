// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * POST /product
 */
router.post('/', controller.create);

/**
 * POST /product/approve
 */
router.put('/:Id/supplier/approve', controller.approve);

/**
 * POST /product/approve
 */
router.put('/:Id/supplier/refuse', controller.delete);

/**
 * GET /product/:soft_code
 */
router.get('/:soft_code', controller.info);

/**
 * GET /product/:soft_code/price_picture
 */
router.get('/:soft_code/price_picture', controller.price_picture);

/**
 * GET /product/:barcode/barcode
 */
router.get('/:barcode/barcode', controller.list_by_barcode);

/**
 * PUT /product/:soft_code/price_qty_weight
 */
router.put('/:soft_code/price_qty_weight', controller.update_price_qty_weight);

/**
 * PUT /product/:soft_code/update_price_store_status
 */
router.put('/:soft_code/update_price_store_status', controller.update_price_store_status);

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
 * PUT /product/:soft_code/barcode_2
 */
router.put('/:soft_code/barcode_2', controller.barcode_2);

/**
 * PUT /product/:soft_code/floor
 */
router.put('/:soft_code/floor', controller.floor);

/**
 * PUT /product/:soft_code/rack_zone
 */
router.put('/:soft_code/rack_zone', controller.rack_zone);

/**
 * PUT /product/:soft_code/weight
 */
router.put('/:soft_code/weight', controller.weight);

/**
 * PUT /product/:soft_code/weight
 */
router.put('/:soft_code/skip', controller.skip);

/**
 * PUT /product/:soft_code/refuse
 */
router.put('/:soft_code/refuse', controller.refuse);

/**
 * POST /product/update_status
 */
router.put('/update_status', controller.update_status);

/**
 * GET /product
 */
 router.get('/', controller.list);

 /**
 * PUT /product/:soft_code/quantity
 */
router.put('/:soft_code/remove', controller.removeProductFromOrders);

//90007755441222
router.put('/:barcode/transfer_quantity', controller.transfer_quantity);

module.exports = router;
