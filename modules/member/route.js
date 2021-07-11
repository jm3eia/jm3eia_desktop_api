// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * PUT /member/wallet
 */
router.put('/wallet', controller.wallet);

module.exports = router;
