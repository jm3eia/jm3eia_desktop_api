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

		if (user_info.device_token) {

			// Order Processing 2
			if (parseInt(req.body.status) === 2 && order.status != 2) {
				message_body = req.custom.local.order_has_been_processing;
				message_title = req.custom.local.order_status_processing;
			}
			// Order On the way 3
			else if (parseInt(req.body.status) === 3 && order.status != 3) {
				message_body = req.custom.local.order_on_way;
				message_title = req.custom.local.order_status_on_way;
			}
			// Order Delivered 4
			else if (parseInt(req.body.status) === 4 && order.status != 4) {
				message_body = req.custom.local.order_delivered(parseInt(order.total), points);
				message_title = req.custom.local.order_status_delivered;
				is_wallet_notification = true;
			}
			// Order Canceled 5
			else if (parseInt(req.body.status) === 5 && order.status != 5) {
				message_body = req.custom.local.order_has_been_canceled;
				message_title = req.custom.local.order_status_canceled;
			}
			// Order Confirmed 7
			else if (parseInt(req.body.status) === 7 && order.status != 7) {
				message_body = req.custom.local.order_has_been_confirmed;
				message_title = req.custom.local.order_status_confirmed;
			}
			// Order Returned 8
			else if (parseInt(req.body.status) === 8 && order.status != 8) {
				message_body = req.custom.local.order_has_been_returned;
				message_title = req.custom.local.order_status_returned;
			}
			// Order Ready to pick 12
			else if (parseInt(req.body.status) === 12 && order.status != 12) {
				message_body = req.custom.local.order_has_been_picked;
				message_title = req.custom.local.order_status_picked;
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

		const ids = order.products.map((p) => ObjectID(p._id.toString()));
		const prod_collection = req.custom.db.client().collection('product');
		const the_products = await prod_collection.find({
			_id: {
				$in: ids
			}
		})
			.toArray() || [];
		let promises = [];

		for (const p of the_products) {
			const quantity_n_order = order.products.find((pi) => pi._id.toString() === p._id.toString());
			const quantity = quantity_n_order.quantity;
			let prod_n_storeArr = [];
			for (const i of p.prod_n_storeArr) {
				if (i.store_id.toString() == order.store_id.toString()) {
					i.quantity += quantity;
				}
				i.store_id = ObjectID(i.store_id.toString());
				prod_n_storeArr.push(i);
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
