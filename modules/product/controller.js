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
		soft_code: req.params.soft_code
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
		soft_code: req.params.soft_code
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
		soft_code: req.params.soft_code
	}
	mainController.update(req, res, collectionName);
};

/**
 * Update quantities of product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.quantity = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/increase_quantity')
	const filter = { $or: [{ "soft_code": req.params.soft_code }, { "variants.soft_code": req.params.soft_code }] };

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

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	if (product.soft_code == req.params.soft_code) {
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = parseInt(data.quantity);
			}
			return s;
		});
		row = {
			$set: {
				prod_n_storeArr: prod_n_storeArr,
				lastUser_update: lastUser_update
			}
		};
	} else {
		const variants = product.variants.map((v) => {
			if (v.soft_code == req.params.soft_code) {
				v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity = parseInt(data.quantity);
					}
					return s;
				});
			}
			return v;
		});
		row = {
			$set: {
				variants: variants,
				lastUser_update: lastUser_update
			}
		};
	}
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
		soft_code: req.params.soft_code
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
		soft_code: req.params.soft_code
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
	const filter = { $or: [{ "soft_code": req.params.soft_code }, { "variants.soft_code": req.params.soft_code }] };

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

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	if (product.soft_code == req.params.soft_code) {
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = parseInt(s.quantity) + parseInt(data.quantity);
			}
			return s;
		});
		row = {
			$set: {
				prod_n_storeArr: prod_n_storeArr,
				lastUser_update: lastUser_update
			}
		};
	} else {
		const variants = product.variants.map((v) => {
			if (v.soft_code == req.params.soft_code) {
				v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity = parseInt(s.quantity) + parseInt(data.quantity);
					}
					return s;
				});
			}
			return v;
		});
		row = {
			$set: {
				variants: variants,
				lastUser_update: lastUser_update
			}
		};
	}
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
	const filter = { $or: [{ "soft_code": req.params.soft_code }, { "variants.soft_code": req.params.soft_code }] };

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

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	if (product.soft_code == req.params.soft_code) {
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = parseInt(s.quantity) - parseInt(data.quantity);
			}
			s.quantity = s.quantity >= 0 ? s.quantity : 0;
			return s;
		});
		row = {
			$set: {
				prod_n_storeArr: prod_n_storeArr,
				lastUser_update: lastUser_update
			}
		};
	} else {
		const variants = product.variants.map((v) => {
			if (v.soft_code == req.params.soft_code) {
				v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity = parseInt(s.quantity) - parseInt(data.quantity);
					}
					s.quantity = s.quantity >= 0 ? s.quantity : 0;
					return s;
				});
			}
			return v;
		});
		row = {
			$set: {
				variants: variants,
				lastUser_update: lastUser_update
			}
		};
	}


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
 * Hide products has no quantities
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const filter = {
		status: true,
	};
	const total = await new Promise((resolve, reject) => {
		collection.count(filter, (err, total) => {
			if (err) {
				return resolve(0);
			}
			resolve(total);
		})
	});

	let updated_count = 0;

	const products = await new Promise((resolve, reject) => {
		return collection
			.find(filter, {})
			.toArray(function (err, docs) {
				if (err) {
					return resolve([]);
				}

				return resolve(docs);
			});
	});

	const skus = [];
	for (const doc of products) {
		let has_quantity = false;
		if (doc.variants) {

			for (const v of doc.variants) {

				const variant_has_quantity = v.prod_n_storeArr && v.prod_n_storeArr.filter((s) => s.quantity > 0 && s.status) ? true : false;
				if (variant_has_quantity) {
					has_quantity = true;
					continue;
				}

			}

			if (!has_quantity) {
				skus.push(doc.sku);
			}

		} else {

			has_quantity = doc.prod_n_storeArr && doc.prod_n_storeArr.filter((s) => parseInt(s.quantity) > 0).length > 0 ? true : false;
			if (!has_quantity) {
				skus.push(doc.sku);
			}

		}

	}
	if (skus.length > 0) {
		updated_count = parseInt(updated_count) + skus.length;
		const update_by = { sku: { $in: skus } };
		const row = { $set: { status: false } };
		await new Promise((resolve_update, reject_update) => {
			collection.updateMany(update_by, row)
				.catch((error) => null)
				.then(() => resolve_update(true))
		});
	}

	console.log('Done');
	const local = req.custom.local;
	res.out({
		message: local.saved_done,
		updated_count: updated_count,
	}, enums.status_message.UPDATED);

};