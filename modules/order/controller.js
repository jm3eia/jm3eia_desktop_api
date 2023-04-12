// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require("../../libraries/common");
const axios = require('axios');
const moment = require('moment');
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");
const collectionName = "order";

const SITE_ID = "Jm3eia";

/**
 * Update order status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = async (req, res) => {
	try {
		if (req.params.Id && !ObjectID.isValid(req.params.Id)) {
			return res.out({
				'message': req.custom.local.id_not_valid
			}, enums.status_message.INVALID_URL_PARAMETER);
		}

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

		req.custom.model = require('./models/update_status');


		const isSupplierGlobal = !req.body.supplier_id || req.body.supplier_id === SITE_ID || !ObjectID.isValid(req.body.supplier_id);

		let update_by = {
			_id: ObjectID(req.params.Id),
			'data.supplier._id': isSupplierGlobal ? SITE_ID : ObjectID(req.body.supplier_id)
		};


		const local = req.custom.local;
		const {
			data,
			unset,
			error
		} = await req.custom.getValidData(req);
		if (error) {
			return res.out(error, enums.status_message.VALIDATION_ERROR);
		}
		data.lastUser_update = ObjectID(req.custom.authUser.userId);
		data['data.$.status'] = data.status;
		if (!isSupplierGlobal) {
			delete data.status;
		}
		const row = {
			$set: data
		};
		if (Object.keys(unset).length > 0) {
			row["$unset"] = unset;
		}
		req.custom.cache.unset(collectionName).catch(() => { });

		const response = await collection.updateOne(update_by, row);

		if (response) {
			res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)

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

			if (update_quantity_arr.indexOf(req.body.status) === -1) {
				return false;
			}

			const updated_order = await collection.findOne({
				_id: ObjectID(req.params.Id)
			})
				.then((o) => o)
				.catch(() => null);

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
			//const data = req.body;

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

				console.log('I AM HERE OSAMA');
				const update = prod_collection.updateOne({
					_id: ObjectID(product._id.toString())
				}, {
					$set: { prod_n_storeArr: prod_n_storeArr }
				});
				promises.push(update_remote_quantity(req, remote_product, token));
				promises.push(update);
			}
			Promise.all(promises).catch((err) => console.log(err));
		}
	} catch (err) {
		console.log(err);
		res.out({
			message: err.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}

};

/**
 * List all orders
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = (req, res) => {
	if (req.query.status) {
		req.custom.clean_filter['status'] = parseInt(req.query.status);
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

	mainController.list(req, res, collectionName, {}, (out) => {
		out.data = out.data.map((doc) => {
			try {
				doc.products = doc.products.reduce((prod, curr) => {
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
	mainController.read(req, res, collectionName, (doc) => {

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
		} catch (error) {
			//	doc.products = [];
		}

		res.out(doc);
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
