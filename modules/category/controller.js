// Stores Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const ObjectID = require('mongodb').ObjectID;
const collectionName = "category";

/**
 * List all stores
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
  if (req.query.supplier_id) {
		if (req.query.supplier_id === "Jm3eia") {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		} else {
			if (Array.isArray(req.query.supplier_id)) {
				req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
			} else {
				req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
			}
		}
    }
  mainController.list(req, res, collectionName);
};

/**
 * Read store by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = (req, res) => {
  mainController.read(req, res, collectionName);
};
