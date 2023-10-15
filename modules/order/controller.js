// Orders Controller

// Load required modules
const mainController = require("../../libraries/mainController");
const common = require("../../libraries/common");
const axios = require('axios');
const moment = require('moment');
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");
const { unskipProduct } = require("../product/utils");
const { sendSms } = require("../../libraries/sms");
const { create_coupon } = require("./extra/coupon");
const collectionName = "order";

/**
 * Update order status
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_status = async (req, res) => {

	try {
		const update_quantity_arr = [4, 5, 6, 7, 8, 9, 11];

	const collection = req.custom.db.client().collection(collectionName);
	// original order
	let order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	if (order.status === parseInt(req.body.status)) {
		return res.out({ message: req.custom.local.order_being_processed }, enums.status_message.VALIDATION_ERROR);
	}

	const member_collection = req.custom.db.client().collection('member');
	const user_info = order && order.user_data && order.user_data._id ?
		await member_collection.findOne({ _id: ObjectID(order.user_data._id.toString()) }).catch(() => null) : null;

	req.custom.model = require('./models/update_status')
	mainController.update(req, res, collectionName, async () => {

		update_status_webhook(req.params.Id, req.body.status);
		//update_status_desktop_webhook(req.params.Id, req.body.status);

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
			// else if (parseInt(req.body.status) === 8 && order.status != 8) {
			// 	message_body = req.custom.local.order_notification_body_8;
			// 	message_title = req.custom.local.order_notification_title_8;
			// }
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

		let remoteResponse = {};
		let updateStatusRemoteResponse = {};
		let isRemoteSuccess = null;
		const response_collection = req.custom.db.client().collection("remote_requests_logs");
		if (parseInt(req.body.status) == 17) {
			try {
				const config = {
					method: 'POST',
					url: 'https://jm3eia.tk:83/SalesOrder/CreateSAPInvoice',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					data: order
				};
				const response = await axios(config);
				console.log(order._id, '========================= REQUEST LIKE: ================', order);
				console.log(order._id, '========================= RESPONSE LIKE: ================', response.data);
				await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/CreateSAPInvoice", request: order, response: response.data, created: new Date() });
				remoteResponse = response.data;
				if (response && response.data && response.data.iserror == 0) {
					isRemoteSuccess = true;
					await collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: { status: 8 } });
					update_status_webhook(req.params.Id, 8);
					//updateStatusRemoteResponse = update_status_desktop_webhook(req.params.Id, 8);
				} else {
					isRemoteSuccess = false;
				}
			} catch(err) {
				console.log('========================= CATCHED =======================', err);
				remoteResponse = err;
				isRemoteSuccess = false;
			}

		}

		if (parseInt(req.body.status) == 18) {
			const driverUsername = req.custom.authUser.department === 2 ? req.custom.authUser.username : order.driver_username;
			if (driverUsername) {
				try {
					const config = {
						method: 'POST',
						url: 'https://jm3eia.tk:83/SalesOrder/UpdateOrderStatus3',
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json',
						},
						data: {
							so_id: order.order_number,
							driverusername:  driverUsername
						}
					};
					const response = await axios(config);
					await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/UpdateOrderStatus3", request: {
						so_id: order.order_number,
						driverusername:  driverUsername
					}, response: response.data, created: new Date() });
					remoteResponse = response.data;
					if (response && response.data && response.data.iserror == 0) {
						isRemoteSuccess = true;
						await collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: { status: 8 } });
					} else {
						isRemoteSuccess = false;
					}
				} catch(err) {
					remoteResponse = err;
					isRemoteSuccess = false;
				}
			} else {
				console.log('============= no driver username =============');
			}

		}
		
			
		if (req.custom.authUser.employee) {
			let action = 'update_status';
			let toUpdate = {};

			/* if (parseInt(req.body.status) === 2) action = 'pickup';
			if (parseInt(req.body.status) === 12) action = 'done'; */

			if (req.custom.authUser.department === 1) {
				toUpdate = { employee_username: req.custom.authUser.username }
			}

			if (req.custom.authUser.department === 2) {
				toUpdate = { driver_username: req.custom.authUser.username }
			}

			if (req.custom.authUser.department === 3) {
				toUpdate = { store_manager_username: req.custom.authUser.username }
			}

			await collection.updateOne({
				_id: ObjectID(req.params.Id)
			}, {
				$set: toUpdate
			});

			await common.saveLog(req, action, 'order', ObjectID(req.params.Id), updated_order, order, { status: req.body.status }, null, {...req.query, remote_response: remoteResponse, is_remote_success: isRemoteSuccess});
			
			if (isRemoteSuccess) {
				await common.saveLog(req, action, 'order', ObjectID(req.params.Id), {...updated_order, status: 8}, {...order, status: 17}, { status: req.body.status }, null, {...req.query, remote_response: remoteResponse, is_remote_success: isRemoteSuccess});
			}
		}

		if (!updated_order || update_quantity_arr.indexOf(order.status) > -1) {
			return false;
		}

		if (order.status == 4) {
			const refresh_collection = req.custom.db.client().collection('refresh_juice_gift');
			const exist_promo = await refresh_collection.findOne({
				member_id: order.user_data._id,
			});
			if (!exist_promo) {
				const coupon = create_coupon(req, order);
				const sms_text = req.custom.local.coupon_refresh_juice(coupon);
				await sendSms(order.user_data.mobile, sms_text);
				const refresh_juice_data = {
					member_id: order.user_data._id,
					created_at: new Date(),
				};
				await refresh_collection.insertOne(refresh_juice_data);
			}
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
	} catch (err) {
		console.error('UPDATE STATUS ERROR: ', err);
		return res.out({}, enums.status_message.UNEXPECTED_ERROR);
	}
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
module.exports.listDriverOrders = (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	if (req.custom.authUser.employee) {
		req.custom.clean_filter['driver_username'] = req.custom.authUser.username;
	}

	req.custom.clean_filter['$or'] = [{ status: 8 }, { status: 3 }, { status: 18 }];

	const collection = req.custom.db.client().collection(collectionName);
	collection.aggregate([
		{ $match: req.custom.clean_filter },
		{
			$addFields: {
				delivery_time_plus_24h: {
					$add: ['$delivery_time', 86400000]
				}
			}
		},
		{
			$match: {
				$expr: {
					$lt: ['$delivery_time', '$delivery_time_plus_24h']
				}
			}
		},
		/* { $skip: req.custom.skip },
		{ $limit: req.custom.limit }, */
	]).toArray(async (err, results) => {
		if (err) {
			return res.out({
				'message': err.message
			}, status_message.UNEXPECTED_ERROR);
		}

		const city_collection = req.custom.db.client().collection('city');
		for (let doc of results) {
			if (doc.user_data && doc.user_data.address && doc.user_data.address.city_id) {
				const city = await city_collection.findOne({ _id: ObjectID(doc.user_data.address.city_id.toString()) }, { _id: 1, name: 1, city_number: 1 });
				doc.user_data.address.city = city;
			}
		}

		const out = {
			count: results.length,
			data: results
		};
		const message = results.length > 0 ? enums.status_message.DATA_LOADED : enums.status_message.NO_DATA;
		return res.out(out, message);
	});
};


module.exports.completed = (req, res) => {
	//await common.saveLog(req, action, 'order', ObjectID(req.params.Id), updated_order, order, { status: req.body.status }, null, req.query);

	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	req.custom.clean_filter['created'] = {
		$gte: thirtyDaysAgo
	};

	if (req.custom.authUser && req.custom.authUser.employee) {
		req.custom.clean_filter['employee_username'] = req.custom.authUser.username;
	}

	req.custom.clean_filter['old_data.status'] = 14;
	req.custom.clean_filter['new_data.status'] = 17;

	req.custom.clean_sort = { created: -1 };

	mainController.list(req, res, "employee_logs", { 'new_data.order_number': 1 }, (out) => {
		out.data = out.data.map(d => {
			if (d.new_data && d.new_data.order_number) {
				d.order_number = d.new_data.order_number;
				delete d.new_data;
			}
			return d;
		});

		return res.out(out);
	});


	//const collection = req.custom.db.client().collection(collectionName);
	/* req.custom.limit = 200;
	const currentDate = new Date();
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	req.custom.clean_filter['created'] = {
		$gte: thirtyDaysAgo
	  };
	if (req.custom.authUser && req.custom.authUser.employee) {
		if (req.custom.authUser.department === 3)
			req.custom.clean_filter['store_manager_username'] = req.custom.authUser.username;
		else if (req.custom.authUser.department === 2)
			req.custom.clean_filter['driver_username'] = req.custom.authUser.username;
		else
			req.custom.clean_filter['employee_username'] = req.custom.authUser.username;
	}

	req.custom.clean_filter['status'] = 17;

	mainController.list(req, res, collectionName, { order_number: 1 }); */

	/* collection.aggregate([
		{
			$match: data
		},
		{
			$project: {
				order_number: 1,
				status: 1,
				total: 1,
				payment_method: 1,
				month: { $month: "$created" },
				year: { $year: "$created" }
			}
		},
		{
			$group: {
				_id: {
					month: "$month",
					year: "$year"
				},
				count: { $sum: 1 },
				orders: {
					$push: {
						order_number: "$order_number",
						total: "$total",
						payment_method: "$payment_method",
						status: "$status"
					}
				}
			}
		},
		{
			$sort: {
				"_id.year": 1,
				"_id.month": 1
			}
		}
	], { allowDiskUse:true }).toArray(async (err, result) => {
		if (err) {
			return res.out({
				'message': err.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}

		const uniqueMonths = result.map((item) => ({
			month: item._id.month,
			year: item._id.year
		}));

		// Generate a sequence of months from 1 to the current month
		const currentMonth = currentDate.getMonth() + 1;
		const allMonths = Array.from({ length: currentMonth }, (_, i) => i + 1);

		// Filter the months based on the existing data
		const filteredMonths = allMonths.filter((month) =>
			uniqueMonths.some((m) => m.month === month)
		);

		// Generate a sequence of years based on the data
		const years = [...new Set(result.map((item) => item._id.year))];

		// Cross join the filtered months and years
		const fullMonths = filteredMonths.reduce((acc, month) => {
			const monthsData = years.map((year) => ({
				_id: { month, year },
				count: 0,
				orders: []
			}));
			return acc.concat(monthsData);
		}, []);

		// Merge the full months data with the actual result
		const mergedResult = fullMonths.map((fullMonth) => {
			const match = result.find(
				(item) =>
					item._id.month === fullMonth._id.month &&
					item._id.year === fullMonth._id.year
			);
			return match || fullMonth;
		});

		return res.out(mergedResult.map(r => ({ ...r, month: r._id.month, year: r._id.year, _id: null })));
	}); */
}


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

module.exports.update_address = async (req, res) => {
	/* if (!req.body.delivery_time || !moment(req.body.delivery_time).isValid()) {
		return res.out({ message: 'Delivery time not valid' }, enums.status_message.VALIDATION_ERROR);;
	} */

	const collection = req.custom.db.client().collection(collectionName);
	// original order
	const order = await collection.findOne({ _id: ObjectID(req.params.Id) });

	if (!order) {
		return res.out({
			message: req.custom.local.item_not_exists
		}, enums.status_message.NOT_FOUND);
	}

	req.custom.model = require('./models/address');
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	if (data.city_id) {
		const city_collection = req.custom.db.client().collection('city');
		const city = await city_collection.findOne({ _id: ObjectID(data.city_id.toString()) }, { projection: { _id: 1, name: 1, city_number: 1 } });
		data.city = city;
		if (city) data.city_name = city.name['ar']
	}

	collection.updateOne({ _id: ObjectID(req.params.Id) },
		{
			$set: {
				'user_data.address': data
			},
		}).then((response) => res.out({
			message: req.custom.local.saved_done
		}, enums.status_message.UPDATED))
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));;
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

module.exports.update_delivery_time_only = async (req, res) => {
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

	console.info('delivery time: ', req.body.delivery_time, new Date(moment(req.body.delivery_time)));

	collection.updateOne({ _id: ObjectID(req.params.Id) },
		{
			$set: { delivery_time: new Date(moment(req.body.delivery_time)) },
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

	if (req.query.driver_username) {
		req.custom.clean_filter['driver_username'] = req.query.driver_username;
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

function calculateTimeRange() {
	const start = common.getDate();
	const end = common.getDate();
	start.setHours(start.getHours() - 24);
  	end.setHours(end.getHours() + 4);

  	return { startTime: start, endTime: end };
}

module.exports.getConfiguredOrders = (req, res) => {
	const { startTime, endTime } = calculateTimeRange();

	req.custom.clean_filter['delivery_time'] = {
		$gte: startTime,
		$lte: endTime,
	};

	req.custom.clean_filter['status'] = 11;

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
}

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
				const city = await city_collection.findOne({ _id: ObjectID(doc.user_data.address.city_id.toString()) }, { projection: { _id: 1, name: 1, city_number: 1 } });
				doc.user_data.address.city = city;
			}

			const product_collection = req.custom.db.client().collection('product');
			const newData = [];

			for (let d of doc.data) {
				const newProducts = [];
				for (let p of d.products) {
					const product = await product_collection.findOne({ sku: p.sku }, { projection: { pick_sorting: 1 } });
					newProducts.push({ ...p, pick_sorting: product.pick_sorting });
				}
				newData.push({ ...d, products: newProducts });
			}
			doc.data = newData;

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
module.exports.readByOrderNumber = async (req, res) => {
	req.custom.where_property = "order_number";
	//if (req.params.Id) req.params.Id = parseInt(req.params.Id);
	mainController.read(req, res, collectionName, async (doc) => {

		const member_collection = req.custom.db.client().collection('member');
		const member = await member_collection.findOne({ mobile: doc.user_data.mobile });

		if (member) doc.user_data.has_account = true;
		else doc.user_data.has_account = false;

		if (doc.user_data && doc.user_data.address && doc.user_data.address.city_id) {
			const city_collection = req.custom.db.client().collection('city');
			const city = await city_collection.findOne({ _id: ObjectID(doc.user_data.address.city_id.toString()) }, { _id: 1, name: 1, city_number: 1 });
			doc.user_data.address.city = city;
		}

		return res.out(doc);
	});
};

module.exports.listByPhoneNumber = async (req, res) => {
	req.custom.clean_filter['user_data.mobile'] = req.params.Id;

	const twoMonthsAgo = new Date();
    twoMonthsAgo.setUTCMonth(twoMonthsAgo.getUTCMonth() - 1);

	req.custom.clean_filter['created'] = { $gte: twoMonthsAgo };

	mainController.list(req, res, collectionName, async (out) => {
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
			} catch (error) { }

			return doc;
		});
		res.out(out);
	});
};

module.exports.status = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			message: req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}

	const collection = req.custom.db.client().collection(collectionName);
	collection.findOne({ _id: ObjectID(req.params.Id) }, { projection: { status: 1 } }, async function (err, doc) {
		if (!doc) {
			return res.out({}, enums.status_message.NO_DATA);
		}

		return res.out(doc);
	});
};


module.exports.getDeliveringOrder = async (req, res) => {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.clean_filter = { status: 18 };
	req.custom.limit = 1000;
	mainController.list(req, res, collectionName, { status: 1, driver_username: 1 });
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


	/* const wallet_history_collection = req.custom.db.client().collection('wallet_history');
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
	}); */

	await common.saveLog(req, 'refund_order', 'order', order._id, order, order, { ...data, total_to_transfer: totalToTransfer });

	return res.out({
		message: req.custom.local.saved_done
	}, enums.status_message.UPDATED);
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


module.exports.get_remote_requests = async (req, res) => {
	if (req.query.order_id) {
		req.custom.clean_filter['request.order._id'] = ObjectID(req.query.order_id);
	}
	if (req.query.order_number) {
		req.custom.clean_filter['request.order.order_number'] = req.query.order_number;
	}
	mainController.list(req, res, 'remote_requests_logs');
}



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
					await common.saveLog(req, action, 'order', ObjectID(req.params.Id), { ...doc, ...row['$set'] }, JSON.parse(order_str), { quantity: req.body.quantity }, req.body.employee_username, req.query);
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


const update_status_webhook = (order_id, status) => {
	var config = {
		method: 'put',
		url: `https://jameia.co/api/app/order-status/?status=${status}&id=${order_id}`,
		headers: {
			'Content-Type': 'application/json',
			'app-key': '9cKkvPW6y9hpes0Q01ikfOkdwmpIc2T6r8OBmOjbapmwKw',
      		'app-secret': 'jNmZGUyZTJlpGRRyF35tti0BHkN64WI4AlxNXIxL45gX2i'
		},
	};

	axios(config).then(response => console.log(response.data)).catch(err => console.error(err));

}


const update_status_desktop_webhook = (order_id, status) => {
	var config = {
		method: 'post',
		url: 'https://jm3eia.tk:83/SalesOrder/UpdateOrderStatusToX',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		data: {
			order_id: order_id,
			status: parseInt(status)
		}
	}
	axios(config).then(response => {
		console.log("update_status_desktop_webhook: ", response.data)
		return response.data;
	}).catch(err => {
		console.error(err.response.data);
		return err;
	});
}