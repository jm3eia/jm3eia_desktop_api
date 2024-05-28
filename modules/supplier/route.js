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

/**
 * GET /supplier
 */
router.put('/:Id/busy', controller.update_busy);

router.put('/:Id/working_times', controller.update_working_times);

module.exports = router;