// Inventories Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = "inventory";

/**
 * List all inventories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
  mainController.list(req, res, collectionName);
};

/**
 * Read inventory by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = (req, res) => {
  mainController.read(req, res, collectionName);
};
