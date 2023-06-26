// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * POST /employee/login
 */
router.post('/login', controller.login);

/**
 * POST /employee/logout
 */
router.post('/logout', controller.logout);

/**
 * GET /employee/me
 */
router.get('/me', controller.me);

/**
 * GET /employee/logs
 */
router.get('/logs', controller.logs);

/**
 * GET /employee/stats
 */
router.get('/stats', controller.stats);

/**
 * GET /employee
 */
router.get('/', controller.list);

/**
 * POST /employee
 */
router.post('/', controller.create);

/**
 * GET /employee/:Id
 */
router.get('/:Id', controller.read);

/**
 * PUT /employee/add_device
 */
router.put('/add_device', controller.add_device);

/**
 * PUT /employee/:Id
 */
router.put('/:Id', controller.update);

/**
 * DELETE /employee/:Id
 */
router.delete('/:Id', controller.delete);

module.exports = router;
