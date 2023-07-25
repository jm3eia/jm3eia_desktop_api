// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require("../../libraries/common");
const axios = require('axios');
const moment = require('moment');
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");
const { unskipProduct } = require("../product/utils");
const collectionName = "order";

/**
 * Update order status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = async (req, res) => {

	const update_quantity_arr = [4, 5, 6, 7, 8, 9, 11];

	const collection = req.custom.db.client().collection(collectionName);
	// original order
	let order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const member_collection = req.custom.db.client().collection('member');
	const user_info = order && order.user_data && order.user_data._id ?
		await member_collection.findOne({ _id: ObjectID(order.user_data._id.toString()) }).catch(() => null) : null;

	req.custom.model = require('./models/update_status')
	mainController.update(req, res, collectionName, async () => {

		// Order Completed 4
		if (parseInt(req.body.status) === 4 && order.status != 4) {

			if (order.user_data && order.user_data._id && user_info) {

				let points = parseInt(user_info.points || 0);
				let wallet = parseFloat(user_info.wallet || 0);

				const new_points = req.body.points && common.is_numeric(req.body.points) ? parseInt(req.body.points) : 0;
				if (new_points > 0) {
					if (req.body.payment_method == 'wallet' || req.body.discount_by_wallet == true) {
						wallet = user_info.wallet - wallet2money;
					} else {
						points += parseInt(new_points);
						const point_transactions_collection = req.custom.db.client().collection('point_transactions');
						await point_transactions_collection.insertOne({
							member_id: ObjectID(order.user_data._id.toString()),
							points: parseInt(new_points),
							createdAt: common.getDate(),
							expiresAt: moment(common.getDate()).add(9, 'months').toDate(),
							used: false,
							trashed: false
						}).catch((err) => { console.log('Points transaction error: ', err) });

						const point_history_collection = req.custom.db.client().collection('point_history');
						await point_history_collection.insertOne({
							member_id: ObjectID(order.user_data._id.toString()),
							old_points: user_info.points || 0,
							new_points: points,
							old_wallet: common.getFixedPrice(user_info.wallet || 0),
							new_wallet: common.getFixedPrice(wallet),
							notes: "Bonus from order",
							type: "bonus",
							created: new Date(),
						}).catch((err) => { console.log('Points history error: ', err) });
					}

					await member_collection.updateOne({
						_id: ObjectID(order.user_data._id.toString())
					}, {
						$set: {
							points: points,
							wallet: wallet
						}
					})
						.catch((error) => { });
				}
			}
		}
		// Order Canceled 5
		else if (parseInt(req.body.status) === 5 && order.status != 5 && parseFloat(order.discount_by_wallet_value) > 0) {
			const wallet = parseFloat(user_info.wallet) + parseFloat(order.discount_by_wallet_value);
			await member_collection.updateOne({
				_id: ObjectID(order.user_data._id.toString())
			}, {
				$set: {
					wallet: wallet
				}
			})
				.catch((error) => { });
		}

		let message_body = null;
		let message_title = null;
		let is_wallet_notification = false;

		if (user_info && user_info.device_token) {

			if (user_info.language && ['ar', 'en'].indexOf(user_info.language) > -1) {
				req.custom.local = require(`../../i18n/${user_info.language}`);
			}

			// Order Processing 2
			if (parseInt(req.body.status) === 2 && order.status != 2) {
				message_body = req.custom.local.order_notification_body_2;
				message_title = req.custom.local.order_notification_title_2;
			}
			// Order On the way 3
			else if (parseInt(req.body.status) === 3 && order.status != 3) {
				message_body = req.custom.local.order_notification_body_3;
				message_title = req.custom.local.order_notification_title_3;
			}
			// Order Delivered 4
			else if (parseInt(req.body.status) === 4 && order.status != 4) {
				message_body = req.custom.local.order_notification_body_4;
				message_title = req.custom.local.order_notification_title_4;
				is_wallet_notification = true;
			}
			// Order Canceled 5
			else if (parseInt(req.body.status) === 5 && order.status != 5) {
				message_body = req.custom.local.order_notification_body_5;
				message_title = req.custom.local.order_notification_title_5;
			}
			// Order Disapproved 6
			else if (parseInt(req.body.status) === 6 && order.status != 6) {
				message_body = req.custom.local.order_notification_body_6;
				message_title = req.custom.local.order_notification_title_6;
			}
			// Order Confirmed 7
			else if (parseInt(req.body.status) === 7 && order.status != 7) {
				message_body = req.custom.local.order_notification_body_7;
				message_title = req.custom.local.order_notification_title_7;
			}
			// Order Returned 8
			else if (parseInt(req.body.status) === 8 && order.status != 8) {
				message_body = req.custom.local.order_notification_body_8;
				message_title = req.custom.local.order_notification_title_8;
			}
			// Order Ready to pick 12
			else if (parseInt(req.body.status) === 12 && order.status != 12) {
				message_body = req.custom.local.order_notification_body_12;
				message_title = req.custom.local.order_notification_title_12;
			}
			// Order Time is up 13
			else if (parseInt(req.body.status) === 13 && order.status != 13) {
				message_body = req.custom.local.order_notification_body_13;
				message_title = req.custom.local.order_notification_title_13;
			}


			if (message_body) {
				const device_tokens = [user_info.device_token];
				const message = {
					title: message_title,
					body: message_body,
					url: null,
				};
				await common.send_to_multiple(message, device_tokens, is_wallet_notification).catch(() => null);
			}
		}

		if (!req.custom.authUser.employee && /* ? [2, 12, 14].indexOf(req.body.status) === -1 : */ update_quantity_arr.indexOf(req.body.status) === -1) {
			return false;
		}
		const updated_order = await collection.findOne({
			_id: ObjectID(req.params.Id)
		})
			.then((o) => o)
			.catch(() => null);

		if (req.custom.authUser.employee) {
			let action = 'update_status';

			/* if (parseInt(req.body.status) === 2) action = 'pickup';
			if (parseInt(req.body.status) === 12) action = 'done'; */

			await collection.updateOne({
				_id: ObjectID(req.params.Id)
			}, {
				$set: { employee_username: req.custom.authUser.username }
			});

			await common.saveLog(req, action, 'order', ObjectID(req.params.Id), updated_order, order, { status: req.body.status }, null, req.query);
		}

		if (!updated_order || update_quantity_arr.indexOf(order.status) > -1) {
			return false;
		}

		const skus = updated_order.products.map((p) => p.sku.toString());
		const prod_collection = req.custom.db.client().collection('product');
		const filter = { $or: [{ "sku": { "$in": skus } }, { "variants.sku": { "$in": skus } }] };
		const the_products = await prod_collection.find(filter)
			.toArray() || [];
		let promises = [];

		const token = await get_remote_token(req);
		const data = req.body;

		for (const _sku of skus) {

			const remote_product = {
				store_id: null,
				quantity: 0,
				soft_code: null,
			};

			const lastUser_update = ObjectID(req.custom.authUser.userId);
			let row = {};
			let prod_n_storeArr = [];
			const product = the_products.find((_p) => _p.sku == (_sku.indexOf("-") > -1 ? _sku.substring(0, _sku.indexOf("-")) : _sku))
			if (skus.indexOf(product.sku) > -1) {
				prod_n_storeArr = product.prod_n_storeArr.map((s) => {
					const ordered_product = updated_order.products.find((u_p) => u_p.sku = product.sku);
					if (updated_order.store_id && s && s.store_id && updated_order.store_id.toString() === s.store_id.toString()) {
						s.quantity += parseInt(ordered_product.quantity);

						// Start setting remote product
						remote_product.store_id = s.store_id;
						remote_product.quantity = parseInt(s.quantity);
						remote_product.soft_code = product.soft_code;
						// End setting remote product

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
					if (skus.indexOf(v.sku) > -1) {
						v.prod_n_storeArr = v.prod_n_storeArr.map((s) => {
							const ordered_product = updated_order.products.find((u_p) => u_p.sku = v.sku);
							if (updated_order && updated_order.store_id && s && s.store_id && updated_order.store_id.toString() === s.store_id.toString()) {
								s.quantity += parseInt(ordered_product.quantity);

								// Start setting remote product
								remote_product.store_id = s.store_id;
								remote_product.quantity = parseInt(s.quantity);
								remote_product.soft_code = v.soft_code;
								// End setting remote product

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

			const update = prod_collection.updateOne({
				_id: ObjectID(product._id.toString())
			}, {
				$set: { prod_n_storeArr: prod_n_storeArr }
			});
			promises.push(update_remote_quantity(req, remote_product, token));
			promises.push(update);
		}

		Promise.all(promises).catch((err) => console.log(err));
	});
};

/**
 * Update driver details
 * @param {Object} req 
 * @param {Object} res 
 */
module.exports.update_driver_details = async (req, res) => {

	const collection = req.custom.db.client().collection(collectionName);
	// original order
	let order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	const member_collection = req.custom.db.client().collection('member');
	const user_info = order && order.user_data && order.user_data._id ?
		await member_collection.findOne({ _id: ObjectID(order.user_data._id.toString()) }).catch(() => null) : null;
	//req.body['status'] = 10;
	req.custom.model = require('./models/update_driver_and_status');

	/* const send_notify = async function () {
		let message_body = null;
		let message_title = null;
		let is_wallet_notification = false;

		if (user_info && user_info.device_token) {
			if (user_info.language && ['ar', 'en'].indexOf(user_info.language) > -1) {
				req.custom.local = require(`../../i18n/${user_info.language}`);
			}
			// Order is on delivery
			if (parseInt(req.body.status) === 10 && order.status != 10) {
				message_body = req.custom.local.order_notification_body_10;
				message_title = req.custom.local.order_notification_title_10;
			}

			if (message_body) {
				const device_tokens = [user_info.device_token];
				const message = {
					title: message_title,
					body: message_body,
					url: null,
				};
				await common.send_to_multiple(message, device_tokens, is_wallet_notification).catch(() => null);
			}
		}
	} */

	if (!req.query.read_only) {
		/* await  */mainController.update(req, res, collectionName/* , async () => {
			await send_notify();
		} */);
	} else {
		//await send_notify();
		return res.out(order);
	}
};


/**
 * Update driver details
 * @param {Object} req 
 * @param {Object} res 
 */
module.exports.listDriverOrders = async (req, res) => {
	const collection = req.custom.db.client().collection('employee');

	const employee = await collection.findOne({ _id: ObjectID(req.custom.authUser.userId.toString()) });

	if (req.custom.authUser.employee && employee) {
		req.custom.clean_filter['driver_mobile'] = employee.mobile;
	}

	req.custom.clean_filter['$or'] = [{ status: 8 }, { status: 3 }, { status: 18 }];

	req.custom.clean_filter['delivery_time'] = { "$gte": common.getAdjustedDate(new Date().toString()), };

	mainController.list(req, res, collectionName);

};


module.exports.remove_driver_details = async (req, res) => {
	const collection = req.custom.db.client().collection(collectionName);
	// original order
	const order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	collection.updateOne({ _id: ObjectID(req.params.Id) },
		{
			$unset:
				{ driver_name: '', driver_mobile: '', driver_track_id: '' }
		}).then((response) => res.out({
			message: req.custom.local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));

}

module.exports.update_delivery_time = async (req, res) => {
	if (!req.body.delivery_time || !moment(req.body.delivery_time).isValid()) {
		return res.out({ message: 'Delivery time not valid' }, enums.status_message.VALIDATION_ERROR);;
	}

	const collection = req.custom.db.client().collection(collectionName);
	// original order
	const order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	collection.updateOne({ _id: ObjectID(req.params.Id) },
		{
			$set: { delivery_time: common.getDate(req.body.delivery_time), status: 8 },
			$unset:
				{ driver_name: '', driver_mobile: '', driver_track_id: '' }
		}).then((response) => res.out({
			message: req.custom.local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));;
}

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
	if (req.query.status) {
		if (Array.isArray(req.query.status)) {
			req.custom.clean_filter['status'] = { "$in": req.query.status.map(s => parseInt(s)) };
		} else {
			req.custom.clean_filter['status'] = parseInt(req.query.status);
		}
	}

	if (req.query.driver_mobile) {
		req.custom.clean_filter['driver_mobile'] = req.query.driver_mobile;
	}

	if (req.query.filter && req.query.filter.from_date && req.query.filter.to_date) {
		req.custom.clean_filter['created'] = {
			"$gte": new Date(req.query.filter.from_date.toString()),
			"$lte": new Date(req.query.filter.to_date.toString())
		};
	} else {
		if (req.query.filter && req.query.filter.from_date) {
			req.custom.clean_filter['created'] = { "$gte": new Date(req.query.filter.from_date.toString()) };
		}

		if (req.query.filter && req.query.filter.to_date) {
			req.custom.clean_filter['created'] = { "$lte": new Date(req.query.filter.to_date.toString()) };
		}
	}

	if (req.query.payment_method) {
		req.custom.clean_filter['payment_method.id'] = req.query.payment_method;
	}

	req.custom.clean_sort = {
		created: -1
	};

	mainController.list(req, res, collectionName, {}, (out) => {
		out.data = out.data.map((doc) => {
			try {
				doc.products = doc.products.reduce((prod, curr) => {
					//console.log(curr);
					if (curr.supplier) {
						prod[curr.supplier.name.en] = prod[curr.supplier.name.en] || [];
						prod[curr.supplier.name.en].push(curr);
					}
					else {
						prod[curr.supplier_id] = prod[curr.supplier_id] || [];
						prod[curr.supplier_id].push(curr);
					}
					return prod;
				}, {});
			} catch (error) {
				//	doc.products = [];
			}

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
	//req.custom.where_property = "order_id";
	mainController.read(req, res, collectionName, async (doc) => {

		try {
			doc.products = doc.products.reduce((prod, curr) => {
				var keyName = curr.supplier.name.en;
				keyName = keyName.replace(' ', '_');

				if (curr.supplier) {
					prod[keyName] = prod[curr.supplier.name.en] || [];
					prod[keyName].push(curr);
				}
				else {
					prod[curr.supplier_id] = prod[curr.supplier_id] || [];
					prod[curr.supplier_id].push(curr);
				}
				return prod;
			}, {});
			if (doc.user_data && doc.user_data.address && doc.user_data.address.city_id) {
				const city_collection = req.custom.db.client().collection('city');
				const city = await city_collection.findOne({ _id: ObjectID(doc.user_data.address.city_id.toString()) }, { _id: 1, name: 1, city_number: 1 });
				doc.user_data.address.city = city;
			}
		} catch (error) {
			//	doc.products = [];
		}

		res.out(doc);
	});
};

/**
 * Read order by number
 * @param {Object} req
 * @param {Object} res
 */
module.exports.readByOrderNumber = (req, res) => {
	req.custom.where_property = "order_number";
	if (req.params.Id) req.params.Id = parseInt(req.params.Id);
	mainController.read(req, res, collectionName, async (doc) => {

		const member_collection = req.custom.db.client().collection('member');
		const member = await member_collection.findOne({ mobile: doc.user_data.mobile });

		if (member) doc.user_data.has_account = true;
		else doc.user_data.has_account = false;

		return res.out(doc);
	});
};

module.exports.refundToWallet = async (req, res) => {
	// 1) get the original order
	const collection = req.custom.db.client().collection(collectionName);
	const order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	// 2) Check if the user data exist
	if (!order.user_data || (!order.user_data._id && !order.user_data.mobile)) {
		return res.out({}, enums.status_message.UNEXPECTED_ERROR);
	}

	// 3) Get the member
	const member_collection = req.custom.db.client().collection('member');
	let where = order.user_data._id ? { _id: ObjectID(order.user_data._id.toString()) } : { mobile: order.user_data.mobile };
	const member = await member_collection.findOne(where).catch(() => null);

	if (!member) {
		return res.out({
			message: 'member does not exist',
		}, enums.status_message.VALIDATION_ERROR);
	}


	// 4) Get validated data
	req.custom.model = require('./models/refund_to_wallet');

	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	let totalToTransfer = 0;
	const productsSkus = data.products.map(p => p.sku);

	for (const product of order.products) {
		if (productsSkus.includes(product.sku)) {
			const p = data.products.find(i => i.sku === product.sku);
			totalToTransfer += product.price * p.quantity;
		}
	}

	if (data.include_shipping_cost) {
		totalToTransfer += order.shipping_cost;
	}


	const wallet_history_collection = req.custom.db.client().collection('wallet_history');
	let _promise = Promise.resolve(true);

	const newWallet = totalToTransfer + parseFloat(member.wallet || 0);
	const wallet_data = {
		"member_id": ObjectID(member._id.toString()),
		"old_wallet": common.getFixedPrice(member.wallet),
		"new_wallet": common.getFixedPrice(newWallet),
		"notes": `Refund ${totalToTransfer} from order items`,
		"type": "refunded",
		"created": new Date(),
	};
	_promise = wallet_history_collection.insertOne(wallet_data);

	await member_collection.updateOne(where, {
		$set: {
			wallet: newWallet
		}
	});

	await common.saveLog(req, 'refund_to_wallet', 'member', member._id, { ...member, wallet: newWallet }, member, data);

	_promise.catch(() => null).then(() => res.out({
		message: req.custom.local.saved_done
	}, enums.status_message.UPDATED));
}


/**
 * Return product from order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.delete_product = (req, res) => {
	if (!req.custom.authUser.employee) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}
	req.body.quantity = 0;
	update_product_quantity_in_order(req, res, 'product_delete');
};

/**
 * Update product quantity in order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_product_quantity = (req, res) => {
	if (!req.custom.authUser.employee) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	}
	update_product_quantity_in_order(req, res, 'product_update_quantity');
};

module.exports.update_order_number = async (req, res) => {
	const collection = req.custom.db.client().collection(collectionName);
	// original order
	let order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	if (order.status !== 7 && order.status !== 6 && order.status !== 11) {
		return res.out({
			message: req.custom.local.order_not_confirmed
		}, enums.status_message.VALIDATION_ERROR);
	}

	req.custom.model = require('./models/update_order_number');

	mainController.update(req, res, collectionName);

}


/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.status_report = async (req, res) => {
	/* if (req.query.filter && req.query.filter.date) {
		let startDate = new Date(req.query.filter.date.toString());
		let endDate = new Date(moment(startDate).utc().add(1, 'd'));

		req.custom.clean_filter['delivery_time'] = {
			"$gte": startDate,
			"$lte": endDate
		};
	} */

	if (req.query.date) {
		let startDate = req.query.date;
		let endDate = moment(startDate).add(1, 'day').toString();

		req.custom.clean_filter['delivery_time'] = {
			"$gte": common.getAdjustedDate(startDate),
			"$lte": common.getAdjustedDate(endDate)
		};
		console.log('start date: ', common.getAdjustedDate(startDate));
		console.log('end date: ', common.getAdjustedDate(endDate));
	}


	mainController.list(req, res, collectionName, { "status": 1, "delivery_time": 1 }, (out) => {
		console.log('Results count: ', out.data.length);
		let data = [];
		for (let i = 0; i < 24; i++) {
			data[i] = [];
			for (let ii = 0; ii <= 14; ii++) {
				data[i].push(out.data.filter(o => moment(o.delivery_time).utc().hours() == i && o.status == ii).length);
			}
		}
		out.data = data;
		res.out(out);
	});
};

function get_remote_token(req) {
	if (
		!req.custom.config.desktop.app_id ||
		!req.custom.config.desktop.app_secret ||
		!req.custom.config.desktop.email ||
		!req.custom.config.desktop.password
	) {
		return false;
	}
	var data = JSON.stringify({
		"appId": req.custom.config.desktop.app_id,
		"appSecret": req.custom.config.desktop.app_secret,
		"email": req.custom.config.desktop.email,
		"password": req.custom.config.desktop.password,
	});

	var config = {
		method: 'post',
		url: `${req.custom.config.desktop.base_url}/auth/login`,
		headers: {
			'Content-Type': 'application/json',
			'Language': 'ar'
		},
		data: data
	};

	return axios(config)
		.then(function (response) {
			return response.data && response.data.results && response.data.results.token;
		})
		.catch(function (error) {
			console.log(error);
		});

}

function update_remote_quantity(req, p, token) {
	if (!token) {
		return Promise.resolve(false);
	}
	var data = JSON.stringify({
		"store_id": p.store_id,
		"quantity": p.quantity
	});

	var config = {
		method: 'put',
		url: `${req.custom.config.desktop.base_url}/product/${p.soft_code}/decrease_quantity`,
		headers: {
			'Accept': 'application/json',
			'Language': 'en',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: data
	};

	return axios(config)
		.catch(function (error) {
			console.log(error);
		});
}


function update_product_quantity_in_order(req, res, action) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	if (req.params.Id && !ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}
	if (Number(req.body.quantity) < 0 || Number(req.body.quantity) == NaN) {
		return res.out({
			'message': req.custom.local.quantity_not_valid
		}, enums.status_message.VALIDATION_ERROR);
	}
	const collection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;

	collection.findOne({
		_id: ObjectID(req.params.Id)
	}, function (err, doc) {
		if (!doc) {
			return res.out({
				"message": local.item_not_exists
			}, enums.status_message.VALIDATION_ERROR);
		}

		const order_str = JSON.stringify(doc);
		if (!order_str.includes(req.params.soft_code)) {
			return res.out({
				"message": local.item_not_exists
			}, enums.status_message.VALIDATION_ERROR);
		}

		let total = doc.total;
		let subtotal = doc.subtotal;
		let products = [];

		for (const p of doc.products) {
			if (p.soft_code.toString() == req.params.soft_code.toString()) {
				total -= p.price * p.quantity;
				total = parseFloat(total > 0 ? total : 0);

				subtotal -= p.price * p.quantity;
				subtotal = parseFloat(subtotal > 0 ? subtotal : 0);
				req.body.quantity = parseInt(req.body.quantity);
				p.quantity = parseInt(p.quantity);
				p.price = parseFloat(p.price);

				total += p.price * req.body.quantity;
				subtotal += p.price * req.body.quantity;

				p.quantity = parseInt(req.body.quantity || 0);
				p.modified = new Date();
			}
			products.push(p);
		}

		req.custom.db.client().collection('adminmember').findOne({
			_id: doc.lastupdate_user
		}, function (err, usr) {

			const update_by = req.custom.update_by != undefined ? req.custom.update_by : {
				_id: ObjectID(req.params.Id)
			};
			const row = {
				$set: {
					products: products,
					subtotal: subtotal,
					total: total,
					data: doc.data ? doc.data.map(d => {
						return d.products.findIndex(p => p.soft_code.toString() == req.params.soft_code.toString()) > -1 ? { ...d, products: d.products.map(p => p.soft_code.toString() == req.params.soft_code.toString() ? products.find(np => np.soft_code.toString() == p.soft_code.toString()) : p) } : d
					}) : null,
					lastupdate_user_name: usr ? usr.username : ''
				}
			};
			collection.updateOne(update_by, row)
				.then(async (response) => {
					await common.saveLog(req, action, 'order', ObjectID(req.params.Id), row['$set'], doc, { quantity: req.body.quantity }, req.body.employee_username, req.query);
					await common.updateOrderEmployee(req, req.params.Id, req.params.soft_code, action);
					await unskipProduct(req, action).catch(null);
					return res.out({
						message: local.saved_done
					}, enums.status_message.UPDATED)
				})
				.catch((error) => res.out({
					message: error.message
				}, enums.status_message.UNEXPECTED_ERROR));
		});
	});
}
