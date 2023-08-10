const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/employee/clear_logs', controller.deleteAllEmployeeLogs);

router.get('/employee/admin/:Id', controller.getAdminById);

module.exports = router;