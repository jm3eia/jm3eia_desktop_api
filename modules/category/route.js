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
 * PUT /category
 */
router.put('/:Id', controller.update);

/**
 * GET /category/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
