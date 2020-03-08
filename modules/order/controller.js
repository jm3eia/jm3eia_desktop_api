// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const collectionName = "order";

/**
 * Update order status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = (req, res) => {
	req.custom.model = require('./models/update_status')
	mainController.update(req, res, collectionName);
};

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
	mainController.list(req, res, collectionName, {}, (out) => {
		out.data = out.data.map((doc) => {
			doc.products = doc.products.reduce((prod, curr) => {
				prod[curr.supplier_id] = prod[curr.supplier_id] || [];
				prod[curr.supplier_id].push(curr);
				return prod;
			}, {});

			return doc;
		});
		res.out(out);
	});
};

/**
 * Read order by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = (req, res) => {
	mainController.read(req, res, collectionName, (doc) => {

		doc.products = doc.products.reduce((prod, curr) => {
			prod[curr.supplier_id] = prod[curr.supplier_id] || [];
			prod[curr.supplier_id].push(curr);
			return prod;
		}, {});

		res.out(doc);
	});
};
