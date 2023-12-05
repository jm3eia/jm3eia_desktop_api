// Categories Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = "supplier_feature";

/**
 * Create new category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.create = (req, res) => {
  mainController.create(req, res, collectionName);
};

/**
 * Update category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = (req, res) => {
  mainController.update(req, res, collectionName);
};

/**
 * Delete category
 * @param {Object} req
 * @param {Object} res
 */
module.exports.delete = (req, res) => {
  mainController.delete(req, res, collectionName);
};

/**
 * List all categories
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
  mainController.list(req, res, collectionName);
};

/**
 * Read category by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = (req, res) => {
  mainController.read(req, res, collectionName);
};