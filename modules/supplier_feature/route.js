// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /category
 */
router.get('/', controller.list);

/**
 * POST /category
 */
router.post('/', controller.create);

/**
 * GET /category/:Id
 */
router.get('/:Id', controller.read);

/**
 * PUT /category/:Id
 */
router.put('/:Id', controller.update);

/**
 * DELETE /category/:Id
 */
router.delete('/:Id', controller.delete);

module.exports = router;
