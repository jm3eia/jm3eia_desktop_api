// Stores Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = "store";

/**
 * List all stores
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
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
