// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require("../../libraries/common");
const ObjectID = require('mongodb').ObjectID;
const collectionName = "order";

/**
 * Update order status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = async (req, res) => {

	const update_quantity_arr = [4, 5, 6, 7, 8, 9, 11];

	const collection = req.custom.db.client().collection(collectionName);
	let order = await collection.findOne({ _id: ObjectID(req.params.Id) });

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

		order = await collection.findOne({
			_id: ObjectID(req.params.Id)
		})
			.then((o) => o)
			.catch(() => null);

		if (!order || update_quantity_arr.indexOf(order.status) > -1) {
			return false;
		}

		const skus = order.products.map((p) => p.sku.toString());
		const prod_collection = req.custom.db.client().collection('product');
		const filter = { $or: [{ "sku": { "$in": skus } }, { "variants.sku": { "$in": skus } }] };
		const the_products = await prod_collection.find(filter)
			.toArray() || [];
		let promises = [];

		for (const product of the_products) {


			const lastUser_update = ObjectID(req.custom.authUser.userId);
			let row = {};
			let prod_n_storeArr = [];
			if (skus.indexOf(product.sku) > -1) {
				prod_n_storeArr = product.prod_n_storeArr.map((s) => {
					if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
						s.quantity += parseInt(data.quantity);
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
							if (data && data.store_id && s && s.store_id && data.store_id.toString() === s.store_id.toString()) {
								s.quantity += parseInt(data.quantity);
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
				_id: ObjectID(p._id.toString())
			}, {
				$set: { prod_n_storeArr: prod_n_storeArr }
			});
			promises.push(update);
		}

		Promise.all(promises).catch((err) => console.log(err));
	});
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
					prod[curr.supplier_id] = prod[curr.supplier_id] || [];
					prod[curr.supplier_id].push(curr);
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
				prod[curr.supplier_id] = prod[curr.supplier_id] || [];
				prod[curr.supplier_id].push(curr);
				return prod;
			}, {});
		} catch (error) {
			//	doc.products = [];
		}

		res.out(doc);
	});
};
