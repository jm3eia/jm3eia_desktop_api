// Products Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");
const mainController = require("../../libraries/mainController");
const collectionName = "product";

/**
 * Get product info
 * @param {Object} req
 * @param {Object} res
 */
module.exports.info = (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const filter = {
		sku: req.params.sku
	}

	const collection = req.custom.db.client().collection(collectionName);
	collection.findOne(filter, {}, function (err, doc) {
		if (!doc) {
			return res.out({}, enums.status_message.NO_DATA);
		}
		res.out(doc);
	});
};

/**
 * Get price and picture for product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.price_picture = (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const filter = {
		sku: req.params.sku
	}

	const collection = req.custom.db.client().collection(collectionName);
	collection.findOne(filter, { projection: { price: true, picture: true } }, function (err, doc) {
		if (!doc) {
			return res.out({}, enums.status_message.NO_DATA);
		}
		res.out(doc);
	});
};

/**
 * Update price, qty and weight for product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_price_qty_weight = (req, res) => {
	req.custom.model = require('./models/update_price_qty_weight')
	req.custom.update_by = {
		sku: req.params.sku
	}
	mainController.update(req, res, collectionName);
};

/**
 * Update quantities of product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.quantity = (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/quantity')
	const filter = {
		sku: req.params.sku
	}

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const product = await collection.findOne(filter);

	if (!product) {
		return res.out({
			message: local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const prod_n_storeArr = product.prod_n_storeArr.map((s) => {
		if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
			s.quantity = data.quantity;
		}
		return s;
	});

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	const row = {
		$set: {
			prod_n_storeArr: prod_n_storeArr,
			lastUser_update: lastUser_update
		}
	};
	req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Update barcode
 * @param {Object} req
 * @param {Object} res
 */
module.exports.barcode = (req, res) => {
	req.custom.model = require('./models/barcode')
	req.custom.update_by = {
		sku: req.params.sku
	}
	mainController.update(req, res, collectionName);
};

/**
 * Update weight
 * @param {Object} req
 * @param {Object} res
 */
module.exports.weight = (req, res) => {
	req.custom.model = require('./models/weight')
	req.custom.update_by = {
		sku: req.params.sku
	}
	mainController.update(req, res, collectionName);
};

/**
 * Increase quantity for product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.increase_quantity = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/increase_quantity')
	const filter = {
		sku: req.params.sku
	}

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const product = await collection.findOne(filter);

	if (!product) {
		return res.out({
			message: local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const prod_n_storeArr = product.prod_n_storeArr.map((s) => {
		if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
			s.quantity += data.quantity;
		}
		return s;
	});

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	const row = {
		$set: {
			prod_n_storeArr: prod_n_storeArr,
			lastUser_update: lastUser_update
		}
	};
	req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Decrease quantity for product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.decrease_quantity = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/increase_quantity')
	const filter = {
		sku: req.params.sku
	}

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const product = await collection.findOne(filter);

	if (!product) {
		return res.out({
			message: local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const prod_n_storeArr = product.prod_n_storeArr.map((s) => {
		if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
			s.quantity -= data.quantity;
		}
		s.quantity = s.quantity >= 0 ? s.quantity : 0;
		return s;
	});

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	const row = {
		$set: {
			prod_n_storeArr: prod_n_storeArr,
			lastUser_update: lastUser_update
		}
	};
	req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};
