// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /store
 */
router.get('/', controller.list);

/**
 * GET /store/:Id
 */
router.get('/:Id', controller.read);

module.exports = router;
