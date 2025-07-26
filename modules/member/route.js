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

/**
 * GET /member
 */
router.get('/', controller.list);

/**
 * GET /member/:mobile
 */
 router.get('/:mobile', controller.read);

 /**
  * PUT /member/:Id
  */
 router.put('/:Id', controller.update);

 /**
  * PUT /member/:Id
  */
 router.get('/pro', controller.pro_stats);

module.exports = router;
