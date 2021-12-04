// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * PUT /member/points
 */
router.put('/points', controller.points);

/**
 * PUT /member/wallet
 */
router.put('/wallet', controller.wallet);

module.exports = router;
