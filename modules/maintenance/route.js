// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /maintenance/clean
 */
router.get('/clean', controller.clean);

/**
 * GET /maintenance/restart
 */
router.get('/restart', controller.restart);

module.exports = router;
