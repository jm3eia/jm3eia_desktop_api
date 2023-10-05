const express = require('express');
const router = express.Router();
const controller = require('./controller');

router.post('/employee/clear_logs', controller.deleteAllEmployeeLogs);

//router.get('/employee/admin', controller.getAdminById);

router.post('/order/update', controller.changeStatus);

module.exports = router;