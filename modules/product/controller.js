// Products Controller

// Load required modules
const ObjectID = require("mongodb").ObjectID;
const enums = require("../../libraries/enums");
const mainController = require("../../libraries/mainController");
const collectionName = "product";

/**
 * Update price, qty and weight for product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_price_qty_weight = (req, res) => {
	req.custom.model = require('./models/update_price_qty_weight')
	req.custom.update_by = {
		soft_code: req.params.soft_code
	}
	mainController.update(req, res, collectionName);
};