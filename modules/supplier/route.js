// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * POST /supplier/login
 */
router.post('/login', controller.login);

/**
 * POST /supplier/logout
 */
//router.post('/logout', controller.logout);

/**
 * GET /supplier/me
 */
router.get('/me', controller.me);

/**
 * GET /supplier
 */
router.get('/', controller.list);

module.exports = router;