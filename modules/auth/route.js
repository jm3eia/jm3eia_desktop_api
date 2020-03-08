// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * POST /auth/login
 */
router.post('/login', controller.login);

/**
 * GET /auth
 */
router.get('/', controller.me);

module.exports = router;
