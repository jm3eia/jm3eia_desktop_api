// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /stats
 */
router.get('/', controller.list);


module.exports = router;
