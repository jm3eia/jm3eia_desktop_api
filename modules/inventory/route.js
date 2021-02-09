// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /inventory
 */
router.get('/', controller.list);

/**
 * GET /inventory/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
