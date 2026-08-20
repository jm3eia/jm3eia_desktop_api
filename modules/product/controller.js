// Products Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const common = require("../../libraries/common");
const enums = require("../../libraries/enums");
const mainController = require("../../libraries/mainController");
const { skipProduct, unskipProduct,  update_base_product, get_prod_status_by_quantity, ensure_prod_n_store_arr } = require('./utils');
const collectionName = "product";

/**
 * Get product info
 * @param {Object} req
 * @param {Object} res
 */
/* module.exports.info = (req, res) => {
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
}; */

module.exports.info = async (req, res) => {
	try {
		if (req.custom.isAuthorized === false) {
			return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
		}
	
		const filter = {
			soft_code: req.params.soft_code
		}
	
		const collection = req.custom.db.client().collection(collectionName);
		const order_collection = req.custom.db.client().collection("order");
		const product = await collection.findOne(filter);
		if (!product) return res.out({ message: "Product not found" }, enums.status_message.NO_DATA);
	
		if (product.floor && [1, 2, 3, 4, 5].includes(product.floor)) {
			const local = req.custom.local;
			product.floor = local.product_floors[product.floor];
		}
		if (product.picture) product.picture_with_base = process.env.MEDIA_URL + product.picture;
		
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const result = await order_collection.aggregate([
			{
				$match: {
					$or: [ { status: 11 }, { status: 1 } ],
					created: { $gte: twentyFourHoursAgo },
					"products._id": product._id
				}
			},
			{ $unwind: "$products" },
			{
				$match: {
					"products._id": product._id
				}
			},
			{
				$group: {
					_id: null,
					total_quantity: { $sum: "$products.quantity" }
				}
			}
		]).toArray();

		const totalQuantity = result.length > 0 ? result[0].total_quantity : 0;
	
		return res.out({...product, confirmed_orders: totalQuantity});
	} catch (err) {
		console.error(err);
		return res.out({ message: err.message }, enums.status_message.UNEXPECTED_ERROR);
	}
};


module.exports.product_details = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const category_collection = req.custom.db.client().collection("category");
	const supplier_collection = req.custom.db.client().collection("supplier");
	const product = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!product) {
		return res.out({}, enums.status_message.NO_DATA);
	}
	if (product.floor && [1, 2, 3, 4, 5].includes(product.floor)) {
		const local = req.custom.local;
		product.floor = local.product_floors[product.floor];
	}
	if (product.picture) {
		product.picture_with_base = process.env.MEDIA_URL + product.picture;
	}

	const categories_ids = product.prod_n_categoryArr ? product.prod_n_categoryArr.map(i => ObjectID(i.category_id.toString())) : [];

	const categories = categories_ids.length > 0 ? await category_collection.find({ _id: { $in: categories_ids } }).toArray() : [];

	const supplier = product.supplier_id
    ? await supplier_collection.findOne({
        _id: ObjectID(product.supplier_id.toString()),
      })
    : null;

	product.categories = categories;
	product.supplier = supplier;

	res.out(product);
	
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
module.exports.update_price_qty_weight = async (req, res) => {
	req.custom.model = require('./models/update_price_qty_weight')
	req.custom.update_by = {
		soft_code: req.params.soft_code
	}

	const collection = req.custom.db.client().collection(collectionName);
	const oldProduct = await collection.findOne(req.custom.update_by);
	/* if (oldProduct && oldProduct.base_product && oldProduct.base_product.sku) {
		return res.out({ message: "You cannot update the quantity of this product because it feeds it from " + oldProduct.base_product.sku }, enums.status_message.VALIDATION_ERROR);
	} */

	mainController.update(req, res, collectionName, async () => {
		const newProduct = await collection.findOne(req.custom.update_by);
		update_base_product(req, newProduct, req.body.prod_n_storeArr[0].store_id);
		common.saveActionLog(req, 'UPDATE', 'product', newProduct._id, newProduct, oldProduct);
	});
};

/**
 * Update price, store status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_price_store_status = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/update_price_store_status')
	const collection = req.custom.db.client().collection(collectionName);
	const oldProduct = await collection.findOne({soft_code: req.params.soft_code});

	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}


	let new_prod_n_storeArr = [];
	if (oldProduct.prod_n_storeArr) {
		for (let store of oldProduct.prod_n_storeArr) {
			if (store.store_id.toString() === data.store_id.toString()) {
				new_prod_n_storeArr.push({ ...store, status: data.status });
			} else {
				new_prod_n_storeArr.push(store);
			}
		}
	}


	let row = {
		$set: {
			prod_n_storeArr: new_prod_n_storeArr,
			price: data.price,
			lastUser_update: ObjectID(req.custom.authUser.userId)
		}
	}
	
	//req.custom.cache.unset(collectionName).catch(() => { });

	collection.updateOne({
		soft_code: req.params.soft_code,
		'prod_n_storeArr.store_id': data.store_id
	}, row)
		.then(async (response) => {
			const newProduct = await collection.findOne({soft_code: req.params.soft_code});
			common.saveActionLog(req, 'UPDATE', 'product', newProduct._id, newProduct, oldProduct);
			res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)
		})
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
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

	/* if (product && product.base_product && product.base_product.sku) {
		return res.out({ message: "You cannot update the quantity of this product because it feeds it from " + product.base_product.sku }, enums.status_message.VALIDATION_ERROR);
	} */

	const oldProduct = JSON.parse(JSON.stringify(product));

	ensure_prod_n_store_arr(product, data.store_id);

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	let status = parseInt(data.quantity) > 0 ? true : product.status;
	try {
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
					last_quantity_update: new Date(),
					needs_search_indexing: true
				}
			};

		} else {
			let totalQuantity = 0;
			const variants = (product.variants || []).map((v) => {
				ensure_prod_n_store_arr(v, data.store_id);
				if (v.soft_code == req.params.soft_code) {
					v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
						if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
							s.quantity = parseInt(data.quantity);
						}
						return s;
					});
				}
				v.prod_n_storeArr.forEach(store => totalQuantity += parseInt(store.quantity) || 0);
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
					last_quantity_update: new Date(),
					needs_search_indexing: true
				}
			};
		}
	} catch (error) {
		return res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}
	//req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => {
			update_base_product(req, product, data.store_id.toString());
			common.saveActionLog(req, 'UPDATE', 'product', product._id, { ...product, variants: row['$set']['variants'] || product.variants, prod_n_storeArr: row['$set']['prod_n_storeArr'], status: row['$set']['status'], lastUser_update: lastUser_update }, oldProduct);
			return res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)
		})
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

module.exports.update_quantity_by_barcode = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/update_quantity_by_barcode')

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const filter = { $or: [{ "barcode": data.barcode }, { "variants.barcode": data.barcode }] };

	const collection = req.custom.db.client().collection(collectionName);
	const product = await collection.findOne(filter);

	if (!product) {
		return res.out({
			message: local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const oldProduct = JSON.parse(JSON.stringify(product));

	ensure_prod_n_store_arr(product, data.store_id);

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	let status = parseInt(data.quantity) > 0 ? true : product.status;
	try {
		if (product.barcode == data.barcode) {
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
					last_quantity_update: new Date()
				}
			};

		} else {
			let totalQuantity = 0;
			const variants = (product.variants || []).map((v) => {
				ensure_prod_n_store_arr(v, data.store_id);
				if (v.barcode == data.barcode) {
					v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
						if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
							s.quantity = parseInt(data.quantity);
						}
						return s;
					});
				}
				v.prod_n_storeArr.forEach(store => totalQuantity += parseInt(store.quantity) || 0);
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
					last_quantity_update: new Date()
				}
			};
		}
	} catch (error) {
		return res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}
	//req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => {
			update_base_product(req, product, data.store_id.toString());
			common.saveActionLog(req, 'UPDATE', 'product', product._id, { ...product, variants: row['$set']['variants'] || product.variants, prod_n_storeArr: row['$set']['prod_n_storeArr'], status: row['$set']['status'], lastUser_update: lastUser_update }, oldProduct);
			return res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)
		})
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
	/* if (!req.custom.authUser || !req.custom.authUser.employee || req.custom.authUser.department !== 3) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	} */
	req.custom.model = require('./models/rack_zone');
	req.custom.update_by = {
		soft_code: req.params.soft_code
	};
	const local = req.custom.local;
	const product_collection = req.custom.db.client().collection(collectionName);
	const product_before = await product_collection.findOne(req.custom.update_by);

	mainController.update(req, res, collectionName, async (response) => {
		if (req.custom.authUser && req.custom.authUser.employee && req.custom.authUser.department === 3) {
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
		}
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

	/* if (product && product.base_product && product.base_product.sku) {
		return res.out({ message: "You cannot update the quantity of this product because it feeds it from " + product.base_product.sku }, enums.status_message.VALIDATION_ERROR);
	} */

	const oldProduct = JSON.parse(JSON.stringify(product));

	ensure_prod_n_store_arr(product, data.store_id);

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	try {
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
					last_quantity_update: new Date(),
					needs_search_indexing: true
				}
			};

		} else {
			let totalQuantity = 0;
			const variants = (product.variants || []).map((v) => {
				ensure_prod_n_store_arr(v, data.store_id);
				if (v.soft_code == req.params.soft_code) {
					v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
						if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
							s.quantity = parseInt(s.quantity) + parseInt(data.quantity);
						}
						return s;
					});
				}
				v.prod_n_storeArr.forEach(store => totalQuantity += parseInt(store.quantity) || 0);
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
					last_quantity_update: new Date(),
					needs_search_indexing: true
				}
			};
		}
	} catch (error) {
		return res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}
	collection.updateOne(filter, row)
		.then((response) => {
			req.custom.cache.unset(collectionName).catch(() => { });
			update_base_product(req, product, data.store_id.toString(), "increase", data.quantity);
			common.saveActionLog(req, 'UPDATE', 'product', product._id, { ...product, variants: row['$set']['variants'] || product.variants, prod_n_storeArr: row['$set']['prod_n_storeArr'], status: row['$set']['status'], lastUser_update: lastUser_update }, oldProduct);;
			return res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)
		})
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
	/* if (product && product.base_product && product.base_product.sku) {
		return res.out({ message: "You cannot update the quantity of this product because it feeds it from " + product.base_product.sku }, enums.status_message.VALIDATION_ERROR);
	} */

	if (!product) {
		return res.out({
			message: local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const oldProduct = JSON.parse(JSON.stringify(product));

	ensure_prod_n_store_arr(product, data.store_id);

	const lastUser_update = ObjectID(req.custom.authUser.userId);
	let row = {};
	let prod_n_storeArr = [];
	try {
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
					lastUser_update: lastUser_update,
					last_quantity_update: new Date()
				}
			};
		} else {
			let totalQuantity = 0;
			const variants = (product.variants || []).map((v) => {
				ensure_prod_n_store_arr(v, data.store_id);
				if (v.soft_code == req.params.soft_code) {
					v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
						if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
							s.quantity = parseInt(s.quantity) - parseInt(data.quantity);
						}
						s.quantity = s.quantity >= 0 ? s.quantity : 0;
						return s;
					});
				}
				v.prod_n_storeArr.forEach(store => totalQuantity += parseInt(store.quantity) || 0);
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
					status: totalQuantity > 0 ? true : false,
					last_quantity_update: new Date()
				}
			};
		}
	} catch (error) {
		return res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}


	//req.custom.cache.unset(collectionName).catch(() => { });
	collection.updateOne(filter, row)
		.then((response) => {
			update_base_product(req, product, data.store_id.toString(), "decrease", data.quantity);
			common.saveActionLog(req, 'UPDATE', 'product', product._id, { ...product, variants: row['$set']['variants'] || product.variants, prod_n_storeArr: row['$set']['prod_n_storeArr'], status: row['$set']['status'], lastUser_update: lastUser_update }, oldProduct);
			return res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)
		})
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
		supplier_id: { $exists: false }
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
	if (req.query.supplier_id) {
		if (req.query.supplier_id === "Jm3eia") {
			req.custom.clean_filter['supplier_id'] = { $exists: false };
		} else {
			if (Array.isArray(req.query.supplier_id)) {
				req.custom.clean_filter['supplier_id'] = { $in: req.query.supplier_id.map(s => ObjectID(s)) };
			} else {
				req.custom.clean_filter['supplier_id'] = ObjectID(req.query.supplier_id);
			}
		}
    }

	if (req.query.status) {
		req.custom.clean_filter['status'] = req.query.status;
	}

	if (req.query && req.query.quantity_from_date && req.query.quantity_to_date) {
		req.custom.clean_filter['last_quantity_update'] = {
			"$gte": new Date(req.query.quantity_from_date.toString()),
			"$lte": new Date(req.query.quantity_to_date.toString())
		};
	} else {
		if (req.query && req.query.quantity_from_date) {
			req.custom.clean_filter['last_quantity_update'] = { "$gte": new Date(req.query.quantity_from_date.toString()) };
		}

		if (req.query && req.query.quantity_to_date) {
			req.custom.clean_filter['last_quantity_update'] = { "$lte": new Date(req.query.quantity_to_date.toString()) };
		}
	}

	mainController.list(req, res, collectionName);
};

/**
 * List products by barcode
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list_by_barcode = (req, res) => {
	req.custom.clean_filter['barcode'] = req.params.barcode;

	mainController.list(req, res, collectionName);
};

module.exports.list_out_of_stock = (req, res) => {
	req.custom.clean_filter["prod_n_storeArr"] = {
        $elemMatch: {
            store_id: ObjectID("5d3827c683545d0366ac4285"),
            $or: [
                { quantity: { $lte: 0 } },
                { status: false }
            ]
        }
    }

	if (req.query && req.query.from_date && req.query.to_date) {
		req.custom.clean_filter['out_of_stock_at'] = {
			"$gte": new Date(req.query.from_date.toString()),
			"$lte": new Date(req.query.to_date.toString())
		};
	} else {
		if (req.query && req.query.from_date) {
			req.custom.clean_filter['out_of_stock_at'] = { "$gte": new Date(req.query.quantity_from_date.toString()) };
		}

		if (req.query && req.query.to_date) {
			req.custom.clean_filter['out_of_stock_at'] = { "$lte": new Date(req.query.to_date.toString()) };
		}
	}

	req.custom.clean_filter['supplier_id'] = { $exists: false };

	mainController.list(req, res, collectionName, { rack_zone: 1, barcode: 1, soft_code: 1, out_of_stock_at: 1, name: 1 });
};


module.exports.list_main_screen_products = (req, res) => {
	req.custom.clean_sort = {
		"sorting": 1
	};
	req.custom.clean_filter['supplier_id'] = { $exists: false };
	req.custom.clean_filter['status'] = true;
	//req.custom.limit = 4;
	mainController.list(req, res, "feature", {
		"_id": 1,
		"name": 1,
		"expiration_date": 1,
		"expiration_date_message": 1,
		"starts_at": 1,
		"ends_at": 1,
		"sorting": 1
	}, async (out) => {
		try {
		const features = out.data;
		const product_collection = req.custom.db.client().collection("product");
		const projection = {
			"_id": 0,
			"sku": 1,
			"name": 1,
			"barcode": 1,
			"picture": 1,
			"old_price": 1,
			"price": 1,
			"pro_price": 1,
			"prod_n_storeArr": 1,
			"show_discount_percentage": 1,
			"discount_price_valid_until": 1,
			"vip_old_price": 1,
			"vip_price": 1,
			"vip_discount_price_valid_until": 1,
		};
		const featured = [];
		for (const feature of features) {
			
			const filter = {};
			filter['status'] = true;
			filter['features.feature_id'] = ObjectID(feature._id.toString());

			const pipeline = [
				{
					$match: filter
				},
				{
					$addFields: {
						"order": {
							"$filter": {
								"input": "$features",
								"as": "p",
								"cond": {
									"$eq": ["$$p.feature_id", feature._id]
								}
							}
						}
					}
				},
				{
					$sort: {
						"order.sorting": 1
					}
				},
				{
					$limit: 1000
				},
				{
					$project: projection
				}
			];
			const options = {
				"allowDiskUse": true
			};

			const products = await product_collection.aggregate(pipeline, options).toArray();
			if (products && products.length > 0) {
				feature.products = products;//products.map((i) => normalizeProduct(req, user, i));
				if (feature.products.length > 0) featured.push(feature);
			}

		}
		
		out.data = featured.filter(f => (!f.expiration_date || f.expiration_date > new Date()) && f.products.filter(i => !i.exchange_with_points || user.member_id).length > 0);
		return res.out({ data: out.data.slice(0, 4), count: out.data.length });
		} catch (e) {
			console.error(req.originalUrl, e);
			return res.out({
				'message': e.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}
	});
};


module.exports.removeProductFromOrders = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const quantity = 0;

	const collection = req.custom.db.client().collection('order');
	const local = req.custom.local;

	const orders = await collection.find({ 'data.products.soft_code': req.params.soft_code, status: { $in: [1, 11] } }).toArray() || [];

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
			message: local.saved_done,
			count: promises.length,
			orders: orders
		}, enums.status_message.UPDATED))
		.catch((err) => res.out({
			message: err.message
		}, enums.status_message.UNEXPECTED_ERROR));
}


module.exports.create = async function (req, res) {
	if (req.custom.isAuthorized === false || !req.custom.authUser.supplier) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	req.body.sku = req.body.sku || req.body.soft_code;
	req.body.supplier_id = req.custom.authUser.userId;
	req.custom.model = req.custom.model || require(`./model`);

	if (req.body.features && req.body.features.length > 0) {
		req.body.features = req.body.features.map(f => ({ ...f, feature_id: ObjectID(f.feature_id) }));
	}

	const collection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	data.status = false;
	data.created = new Date();
	data.prod_n_storeArr = [{ store_id: ObjectID('5d3827c683545d0366ac4285'), quantity: 0, status: true }];
	data.is_gift = false;
	data.show_discount_percentage = false;
	data.free_shipping = false;
	data.fast_shipping = false;
	data.created_by = ObjectID(req.custom.authUser.userId);
	collection.insertOne(data)
		.then((response) => res.out({
			message: local.saved_done,
			insertedId: response.insertedId
		}, enums.status_message.CREATED))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};


module.exports.update = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	
	req.custom.model = require(`./models/update_status`);
	
	mainController.update(req, res, collectionName);
};


module.exports.approve = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	const collection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;
	const update_by = req.custom.update_by != undefined ? req.custom.update_by : {
		_id: ObjectID(req.params.Id)
	};
	collection.updateOne(update_by, {
		$set: { status: true }
	})
		.then((response) => res.out({
			message: local.saved_done,
			insertedId: response.insertedId
		}, enums.status_message.CREATED))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};



module.exports.delete = (req, res) => {
	mainController.delete(req, res, collectionName);
};


module.exports.transfer_quantity_to_jm3eia = async (req, res) => {
	req.custom.model = require('./models/transfer_quantity');

	const collection = req.custom.db.client().collection('product');

	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const jm3eia_wholesale_id = ObjectID("648479474e9e6379c835aba2");

	const supplier_filter = { barcode: req.params.barcode, supplier_id: jm3eia_wholesale_id };
	const jm3eia_filter = { barcode: req.params.barcode, $or: [ { supplier_id: { $exists: false } }, { supplier_id: null } ] };

	const source_product = await collection.findOne(supplier_filter);

	/* if (!source_product) {
		return res.out({ message: 'Product not found in Jm3eia wholesale' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_product = await collection.findOne(jm3eia_filter);

	if (!destination_product) {
		return res.out({ message: 'Product not found in Jm3eia' }, enums.status_message.VALIDATION_ERROR);
	}

	const source_store = source_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!source_store) {
		return res.out({ message: 'The store not found in the Jm3eia wholesale product' }, enums.status_message.VALIDATION_ERROR);
	}

	/* if (source_store.quantity < data.quantity) {
		return res.out({ message: 'No enough quantity' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_store = destination_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!destination_store) {
		return res.out({ message: 'The store not found in the Jm3eia product' }, enums.status_message.VALIDATION_ERROR);
	}

	const new_source_prod_n_storeArr = source_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity -= data.quantity;
			if (s.quantity < 0) s.quantity = 0;
		}
		return s;
	});

	const new_destination_prod_n_storeArr = destination_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity += data.quantity;
		}
		return s;
	});

	await collection.updateOne({ _id: ObjectID(source_product._id.toString()) }, { $set: { prod_n_storeArr: new_source_prod_n_storeArr, status: get_prod_status_by_quantity(new_source_prod_n_storeArr) } });
	
	await collection.updateOne({ _id: ObjectID(destination_product._id.toString()) }, { $set: { prod_n_storeArr: new_destination_prod_n_storeArr, status: get_prod_status_by_quantity(new_destination_prod_n_storeArr) } });
	
	update_base_product(req, source_product, '5d3827c683545d0366ac4285', 'decrease', data.quantity);
	update_base_product(req, destination_product, '5d3827c683545d0366ac4285', 'increase', data.quantity);

	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)
}

/* module.exports.transfer_quantity_to_wholesale = async (req, res) => {
	req.custom.model = require('./models/transfer_quantity');

	const collection = req.custom.db.client().collection('product');

	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const jm3eia_wholesale_id = ObjectID("648479474e9e6379c835aba2");

	const supplier_filter = { barcode: req.params.barcode, supplier_id: jm3eia_wholesale_id };
	const jm3eia_filter = { barcode: req.params.barcode, $or: [ { supplier_id: { $exists: false } }, { supplier_id: null } ] };

	const source_product = await collection.findOne(jm3eia_filter);

	if (!source_product) {
		return res.out({ message: 'Product not found in Jm3eia' }, enums.status_message.VALIDATION_ERROR);
	}

	const destination_product = await collection.findOne(supplier_filter);

	if (!destination_product) {
		return res.out({ message: 'Product not found in Jm3eia wholesale' }, enums.status_message.VALIDATION_ERROR);
	}

	const source_store = source_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!source_store) {
		return res.out({ message: 'The store not found in the Jm3eia product' }, enums.status_message.VALIDATION_ERROR);
	}

	if (source_store.quantity < data.quantity) {
		return res.out({ message: 'No enough quantity' }, enums.status_message.VALIDATION_ERROR);
	}

	const destination_store = destination_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!destination_store) {
		return res.out({ message: 'The store not found in the Jm3eia wholesale product' }, enums.status_message.VALIDATION_ERROR);
	}

	const new_source_prod_n_storeArr = source_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity -= data.quantity;
		}
		return s;
	});

	const new_destination_prod_n_storeArr = destination_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity += data.quantity;
		}
		return s;
	});

	await collection.updateOne({ _id: ObjectID(source_product._id.toString()) }, { $set: { prod_n_storeArr: new_source_prod_n_storeArr } });

	await collection.updateOne({ _id: ObjectID(destination_product._id.toString()) }, { $set: { prod_n_storeArr: new_destination_prod_n_storeArr } });

	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)
} */


module.exports.transfer_quantity_to_express = async (req, res) => {
	req.custom.model = require('./models/transfer_quantity');

	const collection = req.custom.db.client().collection('product');

	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const supplier_id = ObjectID("658dc00fcf38293bbdae82a2");


	const source_product = await collection.findOne({ barcode: req.params.barcode, $or: [ { supplier_id: { $exists: false } }, { supplier_id: null } ] });

	/* if (!source_product) {
		return res.out({ message: 'Product not found in Jm3eia' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_product = await collection.findOne({ barcode: req.params.barcode, supplier_id: supplier_id });

	if (!destination_product) {
		return res.out({ message: 'Product not found in Jm3eia Express' }, enums.status_message.VALIDATION_ERROR);
	}


	const source_store = source_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!source_store) {
		return res.out({ message: 'The store not found in the Jm3eia Express' }, enums.status_message.VALIDATION_ERROR);
	}

	/* if (source_store.quantity < data.quantity) {
		return res.out({ message: 'No enough quantity' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_store = destination_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!destination_store) {
		return res.out({ message: 'The store not found in the Jm3eia Express product' }, enums.status_message.VALIDATION_ERROR);
	}

	const new_source_prod_n_storeArr = source_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity -= data.quantity;
		}
		return s;
	});

	const new_destination_prod_n_storeArr = destination_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity += data.quantity;
		}
		return s;
	});

	await collection.updateOne({ _id: ObjectID(source_product._id.toString()) }, { $set: { prod_n_storeArr: new_source_prod_n_storeArr, status: get_prod_status_by_quantity(new_source_prod_n_storeArr) } });

	await collection.updateOne({ _id: ObjectID(destination_product._id.toString()) }, { $set: { prod_n_storeArr: new_destination_prod_n_storeArr, status: get_prod_status_by_quantity(new_destination_prod_n_storeArr) } });

	update_base_product(req, source_product, '5d3827c683545d0366ac4285', 'decrease', data.quantity);
	update_base_product(req, destination_product, '5d3827c683545d0366ac4285', 'increase', data.quantity);

	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)
}

module.exports.transfer_quantity_to_mangaf = async (req, res) => {
	req.custom.model = require('./models/transfer_quantity');

	const collection = req.custom.db.client().collection('product');

	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const supplier_id = ObjectID("65b8f396d61b28bf268b85e6");


	const source_product = await collection.findOne({ barcode: req.params.barcode, $or: [ { supplier_id: { $exists: false } }, { supplier_id: null } ] });

	/* if (!source_product) {
		return res.out({ message: 'Product not found in Jm3eia' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_product = await collection.findOne({ barcode: req.params.barcode, supplier_id: supplier_id });

	if (!destination_product) {
		return res.out({ message: 'Product not found in Mangaf' }, enums.status_message.VALIDATION_ERROR);
	}


	const source_store = source_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!source_store) {
		return res.out({ message: 'The store not found in the Jm3eia product' }, enums.status_message.VALIDATION_ERROR);
	}

	/* if (source_store.quantity < data.quantity) {
		return res.out({ message: 'No enough quantity' }, enums.status_message.VALIDATION_ERROR);
	} */

	const destination_store = destination_product.prod_n_storeArr.find(s => s.store_id.toString() === '5d3827c683545d0366ac4285');
	if (!destination_store) {
		return res.out({ message: 'The store not found in the Mangaf product' }, enums.status_message.VALIDATION_ERROR);
	}

	const new_source_prod_n_storeArr = source_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity -= data.quantity;
		}
		return s;
	});

	const new_destination_prod_n_storeArr = destination_product.prod_n_storeArr.map(s => {
		if (s.store_id.toString() === '5d3827c683545d0366ac4285') {
			s.quantity += data.quantity;
		}
		return s;
	});
	

	

	await collection.updateOne({ _id: ObjectID(source_product._id.toString()) }, { $set: { prod_n_storeArr: new_source_prod_n_storeArr, status: get_prod_status_by_quantity(new_source_prod_n_storeArr) } });

	await collection.updateOne({ _id: ObjectID(destination_product._id.toString()) }, { $set: { prod_n_storeArr: new_destination_prod_n_storeArr, status: get_prod_status_by_quantity(new_destination_prod_n_storeArr) } });

	update_base_product(req, source_product, '5d3827c683545d0366ac4285', 'decrease', data.quantity);
	update_base_product(req, destination_product, '5d3827c683545d0366ac4285', 'increase', data.quantity);

	return res.out({
		message: local.saved_done
	}, enums.status_message.UPDATED)
}

module.exports.update_product_by_id = async function (req, res) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	
	req.custom.model = require(`./models/update`);
	
	mainController.update(req, res, collectionName);
};