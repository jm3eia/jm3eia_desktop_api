// Products Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const common = require("../../libraries/common");
const enums = require("../../libraries/enums");
const mainController = require("../../libraries/mainController");
const { skipProduct, unskipProduct } = require('./utils');
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
		if (doc.floor && [1, 2, 3, 4, 5].includes(doc.floor)) {
			const local = req.custom.local;
			doc.floor = local.product_floors[doc.floor];
		}
		if (doc.picture) {
			doc.picture_with_base = process.env.MEDIA_URL + doc.picture;
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
	let status = parseInt(data.quantity) > 0 ? true : product.status;
	if (product.soft_code == req.params.soft_code) {
		if (status == true) {
			status = product.prod_n_storeArr.find((s) => s.quantity > 0 && s.status == true) ? product.status : false;
		}
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = parseInt(data.quantity);
			}
			return s;
		});
		row = {
			$set: {
				prod_n_storeArr: prod_n_storeArr,
				lastUser_update: lastUser_update,
				status: parseInt(data.quantity) > 0 ? true : false,
			}
		};

	} else {
		let totalQuantity = 0;
		const variants = product.variants.map((v) => {
			if (v.soft_code == req.params.soft_code) {
				v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity = parseInt(data.quantity);
					}
					return s;
				});
			}
			v.prod_n_storeArr.forEach(store => totalQuantity += store.quantity);
			return v;
		});
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = totalQuantity;
			}
			return s;
		});
		row = {
			$set: {
				variants: variants,
				lastUser_update: lastUser_update,
				prod_n_storeArr,
				status: totalQuantity > 0 ? true : false,
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
 * Update barcode 2
 * @param {Object} req
 * @param {Object} res
 */
module.exports.barcode_2 = async (req, res) => {
	if (!req.custom.authUser || !req.custom.authUser.employee || req.custom.authUser.department !== 3) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}
	req.custom.model = require('./models/barcode_2')
	req.custom.update_by = {
		soft_code: req.params.soft_code
	}

	const product_collection = req.custom.db.client().collection(collectionName);
	const product_before = await product_collection.findOne(req.custom.update_by);

	mainController.update(req, res, collectionName, async (response) => {
		const local = req.custom.local;
		const product = await product_collection.findOne(req.custom.update_by);
		await common.saveLog(req, 'update_barcode_2', 'product', ObjectID(product._id.toString()), product, product_before, { barcode_2: req.body.barcode_2 }, req.body.employee_username, req.query);
		await common.updateOrderEmployee(req, req.query.order_id, req.params.soft_code, 'update_barcode_2');
		await unskipProduct(req, 'update_barcode_2').catch(null);
	});
};

/**
 * Update floor
 * @param {Object} req
 * @param {Object} res
 */
module.exports.floor = async (req, res) => {
	if (!req.custom.authUser || !req.custom.authUser.employee || req.custom.authUser.department !== 3) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}
	req.custom.model = require('./models/floor');
	if (![1, 2, 3, 4, 5].includes(parseInt(req.body.floor))) {
		return res.out({
		}, enums.status_message.VALIDATION_ERROR);
	}
	req.custom.update_by = {
		soft_code: req.params.soft_code
	}

	const product_collection = req.custom.db.client().collection(collectionName);
	const product_before = await product_collection.findOne(req.custom.update_by);

	mainController.update(req, res, collectionName, async (response) => {
		const local = req.custom.local;
		const product = await product_collection.findOne(req.custom.update_by);
		await common.saveLog(req, 'update_floor', 'product', ObjectID(product._id.toString()), product, product_before, { floor: req.body.floor }, null, req.query);
	});
};

/**
 * Update rack zone
 * @param {Object} req
 * @param {Object} res
 */
module.exports.rack_zone = async (req, res) => {
	if (!req.custom.authUser || !req.custom.authUser.employee || req.custom.authUser.department !== 3) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}
	req.custom.model = require('./models/rack_zone');
	req.custom.update_by = {
		soft_code: req.params.soft_code
	};
	const local = req.custom.local;
	const product_collection = req.custom.db.client().collection(collectionName);
	const product_before = await product_collection.findOne(req.custom.update_by);

	mainController.update(req, res, collectionName, async (response) => {
		const product = await product_collection.findOne(req.custom.update_by);
		await common.saveLog(
			req,
			'update_rack_zone',
			'product',
			ObjectID(product._id.toString()),
			product,
			product_before,
			{ rack_zone: req.body.rack_zone },
			req.body.employee_username,
			req.query
		);
		await common.updateOrderEmployee(req, req.query.order_id, req.params.soft_code, 'update_rack_zone');
		await unskipProduct(req, 'update_rack_zone').catch(null);
	});
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
 * Skip product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.skip = async (req, res) => {
	const local = req.custom.local;
	if (!req.custom.authUser || !req.custom.authUser.employee) {
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}

	const employee_collection = req.custom.db.client().collection('employee');
	const employees = await employee_collection.find({ department: 3 }).toArray();

	const softcode = req.params.soft_code;
	const product_collection = req.custom.db.client().collection(collectionName);
	const product = await product_collection.findOne({ soft_code: softcode });

	if (!product || !employees) {
		return res.out({ message: 'Product or employee not found' }, enums.status_message.NOT_FOUND);
	}

	const device_tokens = employees.filter(e => e.device_token).map(e => e.device_token);
	const message = {
		title: 'تنبيه عاجل!',
		body: `يرجى التوجه الى المحضر ${req.custom.authUser.username} ${product.rack_zone ? '(' + product.rack_zone + ')' : ''}`,
	};


	req.body.employee_username = req.custom.authUser && req.custom.authUser.employee ? req.custom.authUser.username : req.body.employee_username;

	const order_products_actions_collection = req.custom.db.client().collection('order_products_actions');

	req.custom.model = require('./models/skip_product');
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	/* const foundProduct = await order_products_actions_collection.findOne({ order_id: ObjectID(data.order_id), 'product.soft_code': product.soft_code });


	if (foundProduct) {
		return res.out({ message: 'This product is already skipped' }, enums.status_message.UNEXPECTED_ERROR);
	} */

	data.action = 'skip';
	data.product = product;
	data.created = new Date();

	await order_products_actions_collection.insertOne(data);

	await common.saveLog(
		req,
		'skip',
		'product',
		ObjectID(product._id.toString()),
		product,
		product,
		req.body,
		null,
		req.query
	);

	await common.notify_store_managers(message, device_tokens, req.body).catch(() => null);

	await common.updateOrderEmployee(req, req.query.order_id, req.params.soft_code, 'skip');


	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)

};

/**
 * Refuse product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.refuse = async (req, res) => {
	const local = req.custom.local;
	if (!req.custom.authUser || !req.custom.authUser.employee || req.custom.authUser.department !== 3) {
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}

	const product_collection = req.custom.db.client().collection(collectionName);
	const product = await product_collection.findOne({ soft_code: req.params.soft_code });

	await common.saveLog(
		req,
		'refuse',
		'product',
		ObjectID(product._id.toString()),
		product,
		product,
		{},
		req.body.employee_username,
		req.query
	);

	await common.updateOrderEmployee(req, req.query.order_id, req.params.soft_code, 'refuse');
	await unskipProduct(req, 'update_rack_zone').catch(null);

	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)

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
				lastUser_update: lastUser_update,
				status: true,
			}
		};
	} else {
		let totalQuantity = 0;
		const variants = product.variants.map((v) => {
			if (v.soft_code == req.params.soft_code) {
				v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity = parseInt(s.quantity) + parseInt(data.quantity);
					}
					return s;
				});
			}
			v.prod_n_storeArr.forEach(store => totalQuantity += store.quantity);
			return v;
		});
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = totalQuantity;
			}
			return s;
		});
		row = {
			$set: {
				variants: variants,
				lastUser_update: lastUser_update,
				prod_n_storeArr,
				status: true,
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
		let totalQuantity = 0;
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
			v.prod_n_storeArr.forEach(store => totalQuantity += store.quantity);
			return v;
		});
		prod_n_storeArr = product.prod_n_storeArr.map((s) => {
			if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
				s.quantity = totalQuantity;
			}
			return s;
		});
		row = {
			$set: {
				variants: variants,
				prod_n_storeArr,
				lastUser_update: lastUser_update,
				status: totalQuantity > 0 ? true : false
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
		if (!doc) {
			continue;
		}
		let has_quantity = false;
		if (doc.variants) {

			for (const v of doc.variants) {

				const variant_has_quantity = v && v.prod_n_storeArr && v.prod_n_storeArr.filter((s) => s.quantity > 0 && s.status) ? true : false;
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

	console.log('Done', updated_count);
	const local = req.custom.local;
	res.out({
		message: local.saved_done,
		updated_count: updated_count,
	}, enums.status_message.UPDATED);

};

/**
 * List all stores
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
	mainController.list(req, res, collectionName);
};



module.exports.removeProductFromOrders = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const quantity = 0;

	const collection = req.custom.db.client().collection('order');
	const local = req.custom.local;

	const orders = await collection.find({ 'data.products.soft_code': req.params.soft_code, status: { $in: [1, 11] } }).toArray() || [];

	console.log('ORDERS: ', orders.length);

	const promises = [];

	for (let order of orders) {
		let total = order.total;
		let subtotal = order.subtotal;
		let products = [];

		for (const p of order.products) {
			if (p.soft_code.toString() == req.params.soft_code.toString()) {
				total -= p.price * p.quantity;
				total = parseFloat(total > 0 ? total : 0);

				subtotal -= p.price * p.quantity;
				subtotal = parseFloat(subtotal > 0 ? subtotal : 0);
				p.quantity = parseInt(p.quantity);
				p.price = parseFloat(p.price);

				total += p.price * quantity;
				subtotal += p.price * quantity;

				p.quantity = parseInt(quantity || 0);
				p.modified = new Date();
			}
			products.push(p);
		}


		const update_by = {
			_id: ObjectID(order._id.toString())
		};
		const row = {
			$set: {
				products: products,
				subtotal: subtotal,
				total: total,
				data: order.data ? order.data.map(d => {
					return d.products.findIndex(p => p.soft_code.toString() == req.params.soft_code.toString()) > -1 ? { ...d, products: d.products.map(p => p.soft_code.toString() == req.params.soft_code.toString() ? products.find(np => np.soft_code.toString() == p.soft_code.toString()) : p) } : d
				}) : null,
			}
		};

		const update = collection.updateOne(update_by, row);
		promises.push(update);
	}

	Promise.all(promises)
		.then(() => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED))
		.catch((err) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
}