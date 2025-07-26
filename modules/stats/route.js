// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');


/**
 * GET /stats
 */
router.get('/', controller.list);

/**
  * GET /stats/pro
  */
 router.get('/pro', controller.pro_stats);

 router.get('/points', controller.points_stats);


module.exports = router;
