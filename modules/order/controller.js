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
const { claim_wallet_offers, cashback_whatsapp_message, product_unavailable_whatsapp_message } = require("./utils");
const collectionName = "order";


const SUPPLIERS_LIST = require('./suppliers_with_cashback.json');
const { send_to_multiple } = require("../../libraries/notification");

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

		if (order.order_number && parseInt(req.body.status) === 14 && !req.body.order_number) req.body.order_number = order.order_number;
		
		if (order.order_number && parseInt(req.body.status) !== 14 ) req.body.order_number = order.order_number;
		
	
	/* //if (order.order_number) req.body.order_number;
	if (parseInt(req.body.status) == 11) {
		try {
			const remote_order_number = await get_remote_order_number(order._id.toString());
			if (remote_order_number) req.body.order_number = remote_order_number;
			//else delete req.custom.model.order_number;
		} catch(err) {
			console.error('ERROR GETTING ORDER NUMBER: ', err);
		}
	} */

	req.custom.model = require('./models/update_status');

	mainController.update(req, res, collectionName, async () => {

		emmit_change_status(order._id.toString(), user_info.mobile, req.custom.local.order_status_list[req.body.status], user_info.points, user_info.wallet);

		if (parseInt(req.body.status) === 11) {
			update_status_webhook(req.params.Id, req.body.status);
		}
		//update_status_desktop_webhook(req.params.Id, req.body.status);

		// Order Completed 4
		// OR Request reversed 9
		if ((parseInt(req.body.status) === 4 && order.status != 4) || (parseInt(req.body.status) === 9 && order.status === 4)) {
			const is_canceled = parseInt(req.body.status) === 9 && order.status === 4;

			if (parseInt(req.body.status) === 4) {
				collection.updateOne({ _id: ObjectID(order._id.toString()) }, { $set: { delivered_at: common.getDate() } });
			}

			if (order.user_data && order.user_data._id && user_info) {

				let points = parseInt(user_info.points || 0);
				let wallet = parseFloat(user_info.wallet || 0);

				if (parseInt(req.body.status) === 4) {
					
					if (order.offers && order.offers.filter(o => o.type === 'wallet').length > 0) {
						await claim_wallet_offers(req, order.offers.filter(o => o.type === 'wallet'), user_info, order._id);
					}

					if (!user_info.can_spin_wheel) {
						await member_collection.updateOne({ _id: ObjectID(order.user_data._id.toString()) }, { $set: { can_spin_wheel: true } }).catch((error) => { });
					}

				}

				/* if (order.supplier._id !== "Jm3eia" && SUPPLIERS_LIST.includes(order.supplier._id.toString())) {
					const wallet_history_collection = req.custom.db.client().collection('wallet_history');
					const cash_back_amount = ((parseFloat(order.total) - parseFloat(order.shipping_cost)) / 2) < 3 ? ((parseFloat(order.total) - parseFloat(order.shipping_cost)) / 2) : 3;
					const new_wallet = common.getFixedPrice(wallet + parseFloat(cash_back_amount));
					user_info.wallet = common.getFixedPrice(user_info.wallet);
					const wallet_data = {
						"member_id": ObjectID(order.user_data._id.toString()),
						"old_wallet": user_info.wallet,
						"new_wallet": new_wallet,
						"type": "cashback",
						"notes": `Order Cashback - wallet from ${user_info.wallet} to ${new_wallet}`,
						"order_id": ObjectID(order._id.toString()),
						"created": new Date(),
					};
					await wallet_history_collection.insertOne(wallet_data);
	
					console.error("Updating member wallet for user", order.user_data._id.toString(), "with new_wallet", new_wallet);

					await member_collection.updateOne({
						_id: ObjectID(order.user_data._id.toString())
					}, {
						$set: { wallet: new_wallet }
					}).catch((e) => console.error(req.originalUrl, e));

					wallet = new_wallet;
					user_info.wallet = new_wallet;

					const lang = user_info.language && ['ar', 'en'].indexOf(user_info.language) > -1 ? user_info.language : "ar";
					req.custom.local = require(`../../i18n/${lang}`);

					const fallback_message = `${req.custom.local.cashback_notification_title} ${req.custom.local.cashback_notification_body(cash_back_amount)}`;
					cashback_whatsapp_message(order.user_data.mobile, cash_back_amount, lang, fallback_message);
				} */

				// const new_points = order.total ? parseInt(order.total) : 0;
				const new_points = order.payment_method.id === "knet" ? parseInt(order.total) + parseInt(order.total) * 0.1 : parseInt(order.total);
				if (new_points > 0) {
					if (req.body.payment_method == 'wallet' || req.body.discount_by_wallet == true) {
						wallet = user_info.wallet - wallet2money;
					} else {
						const point_transactions_collection = req.custom.db.client().collection('point_transactions');
						const point_history_collection = req.custom.db.client().collection('point_history');
						let point_transaction_data = {
							points: parseInt(new_points),
							createdAt: common.getDate(),
							expiresAt: moment(common.getDate()).add(9, 'months').toDate(),
							used: false,
							trashed: false
						};
						let point_history_data = {
							order_id: ObjectID(order._id.toString()),
							added_points: parseInt(new_points),
							created: common.getDate(),
							expiresAt: moment(common.getDate()).add(9, 'months').toDate(),
						};
						let total_points = 0;
						if (order.points_transfer_mobile) {
							const member = await member_collection.findOne({ mobile: order.points_transfer_mobile });
							total_points = is_canceled ? (parseInt(member.points || 0) - new_points) : (parseInt(member.points || 0) + new_points);
							if (member) {
								point_transaction_data.member_id = ObjectID(member._id.toString());
								point_history_data = {
									...point_history_data,
									member_id: ObjectID(member._id.toString()),
									sender_id: ObjectID(order.user_data._id.toString()),
									old_points: member.points || 0,
									new_points: total_points,
									old_wallet: common.getFixedPrice(member.wallet || 0),
									new_wallet: common.getFixedPrice(member.wallet || 0),
									notes: is_canceled ? "canceled transfered order" : "Transferred",
									type: is_canceled ? "canceled" : "transfered",
								};
								await member_collection.updateOne({ _id: member._id }, { $set: { points: total_points } });
							}
						} else {
							points = is_canceled ? (points - parseInt(new_points)) : (points + parseInt(new_points));
							total_points = points;
							point_transaction_data.member_id = ObjectID(order.user_data._id.toString());
							point_history_data = {
								...point_history_data,
								member_id: ObjectID(order.user_data._id.toString()),
								old_points: user_info.points || 0,
								new_points: points,
								old_wallet: common.getFixedPrice(user_info.wallet || 0),
								new_wallet: common.getFixedPrice(wallet),
								notes: is_canceled ? "canceled order" : "Bonus from order",
								type: is_canceled ? "canceled" : "bonus",
							};
						}

						
						await point_transactions_collection.insertOne(point_transaction_data).catch((err) => { console.log('Points transaction error: ', err) });

						await point_history_collection.insertOne(point_history_data).catch((err) => { console.log('Points history error: ', err) });
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

		if (parseInt(req.body.status) === 8 && order.status != 8 && order.user_data && order.user_data._id && user_info) {
			const deleted_products = order.products.filter(p => p.quantity === 0);
			const whatsapp_message = deleted_products.map(p => p.name['ar']).join(', ');

			product_unavailable_whatsapp_message(user_info.mobile, whatsapp_message);
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

		/* if (!req.custom.authUser.employee && ? [2, 12, 14].indexOf(req.body.status) === -1 : update_quantity_arr.indexOf(req.body.status) === -1) {
			return false;
		} */

		const updated_order = await collection.findOne({
			_id: ObjectID(req.params.Id)
		})
			.then((o) => o)
			.catch(() => null);

		let remoteResponse = {};
		let updateStatusRemoteResponse = {};
		let isRemoteSuccess = null;
		const response_collection = req.custom.db.client().collection("remote_requests_logs");
		/* if (parseInt(req.body.status) == 17) {

			const convertedOrder = convertFields({...order, employee_username: req.body.employee_username});
			try {
				const config = {
					method: 'POST',
					url: 'https://jm3eia.tk:83/SalesOrder/CreateSAPInvoice',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					data: convertedOrder
				};
				console.log('RESPONSE BEFORE: ', order._id);
				const response = await axios(config).catch(err => console.error('ERROR: ', err));
				console.log('RESPONSE AFTER: ', order._id, response.data);
				await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/CreateSAPInvoice", request: convertedOrder, response: response.data, created: new Date() });
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
				await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/CreateSAPInvoice", request: convertedOrder, response: err.response.data, created: new Date() }).catch(err => console.log('that is the real error: ', err, convertedOrder));
			}

		}

		if (parseInt(req.body.status) == 18) {
			const driverUsername = req.body.employee_department && parseInt(req.body.employee_department) === 2 ? req.body.employee_username : order.driver_username;
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
							so_number: order._id.toString(),
							driverusername:  driverUsername,
							delivery_remarks: "",
							user_id: 0
						}
					};
					const response = await axios(config);
					await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/UpdateOrderStatus3", request: {
						so_number: order._id.toString(),
						driverusername:  driverUsername,
						delivery_remarks: "",
						user_id: 0
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
					await response_collection.insertOne({ url: "https://jm3eia.tk:83/SalesOrder/UpdateOrderStatus3", request: {
						so_id: order.order_number,
						driverusername:  driverUsername
					}, response: err.response.data, created: new Date() });
				}
			} else {
				console.log('============= no driver username =============');
			}

		} */
			
		if (req.body.employee_username) {
			let action = 'update_status';
			let toUpdate = {};

			if (req.body.employee_department === 1) {
				toUpdate = { employee_username: req.body.employee_username }
			}

			if (req.body.employee_department === 2) {
				toUpdate = { driver_username: req.body.employee_username }
			}

			if (req.body.employee_department === 3) {
				toUpdate = { store_manager_username: req.body.employee_username }
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

		/* const skus = updated_order.products.map((p) => p.sku.toString());
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

		Promise.all(promises).catch((err) => console.log(err)); */
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
		}).then((response) => {
			update_remote_order_address(req.params.Id, data);
			return res.out({
				message: req.custom.local.saved_done
			}, enums.status_message.UPDATED)
		})
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

	const new_delivery_time = new Date(moment(req.body.delivery_time));

	collection.updateOne({ _id: ObjectID(req.params.Id) },
		{
			$set: { delivery_time: new_delivery_time },
		}).then((response) => {
			update_remote_order_delivery_time(req.params.Id, req.body.delivery_time);
			return res.out({
				message: req.custom.local.saved_done
			}, enums.status_message.UPDATED);
		})
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

	if (req.query.filter && req.query.filter.from_delivery_time && req.query.filter.to_delivery_time) {
		req.custom.clean_filter['delivery_time'] = {
			"$gte": new Date(req.query.filter.from_delivery_time.toString()),
			"$lte": new Date(req.query.filter.to_delivery_time.toString())
		};
	} else {
		if (req.query.filter && req.query.filter.from_delivery_time) {
			req.custom.clean_filter['delivery_time'] = { "$gte": new Date(req.query.filter.from_delivery_time.toString()) };
		}

		if (req.query.filter && req.query.filter.to_delivery_time) {
			req.custom.clean_filter['delivery_time'] = { "$lte": new Date(req.query.filter.to_delivery_time.toString()) };
		}
	}

	if (req.query.filter && req.query.filter.from_delivered_at && req.query.filter.to_delivered_at) {
		req.custom.clean_filter['delivered_at'] = {
			"$gte": new Date(req.query.filter.from_delivered_at.toString()),
			"$lte": new Date(req.query.filter.to_delivered_at.toString())
		};
	} else {
		if (req.query.filter && req.query.filter.from_delivered_at) {
			req.custom.clean_filter['delivered_at'] = { "$gte": new Date(req.query.filter.from_delivered_at.toString()) };
		}

		if (req.query.filter && req.query.filter.to_delivered_at) {
			req.custom.clean_filter['delivered_at'] = { "$lte": new Date(req.query.filter.to_delivered_at.toString()) };
		}
	}

	if (req.query.payment_method) {
		req.custom.clean_filter['payment_method.id'] = req.query.payment_method;
	}

	if (req.query.failed == 'true') {
		req.custom.clean_filter['inserted_remotly'] = false;
	}

	req.custom.clean_sort = {
		created: -1
	};

	mainController.list(req, res, collectionName, {}, (out) => {
		out.data = out.data.map((doc) => {
			try {
				if (doc.data) {
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
				} else {
					const key = doc.supplier && doc.supplier.name ? doc.supplier.name.en : 'unknown';
					doc.products = {
						[key]: doc.products
					}
				}

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
			if (doc.data) {
				doc.products = doc.products.reduce((prod, curr) => {
					if (!curr.supplier_id) curr.supplier_id = "Jm3eia";
	
					prod[curr.supplier_id] = prod[curr.supplier_id] || [];
					prod[curr.supplier_id].push(curr);
					return prod;
				}, {});
			} else {
				const key = doc.supplier && doc.supplier.name ? doc.supplier.name.en : 'unknown';
				doc.products = {
					[key]: doc.products
				}
			}
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
	/* if (!req.custom.authUser.employee) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	} */
	req.body.quantity = 0;
	update_product_quantity_in_order(req, res, 'product_delete');
};

/**
 * Update product quantity in order
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update_product_quantity = (req, res) => {
	/* if (!req.custom.authUser.employee) {
		const local = req.custom.local;
		return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
	} */
	update_product_quantity_in_order(req, res, 'product_update_quantity');
};

module.exports.add_product = async (req, res) => {
	try {
		if (req.custom.isAuthorized === false) {
			return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
		}
	
		if (req.params.Id && !ObjectID.isValid(req.params.Id)) {
			return res.out({
				'message': req.custom.local.id_not_valid
			}, enums.status_message.INVALID_URL_PARAMETER);
		}
	
		req.custom.model = require('./models/add_product');
		const {
			data,
			error
		} = await req.custom.getValidData(req);
		if (error) {
			return res.out(error, enums.status_message.VALIDATION_ERROR);
		}
	
		const collection = req.custom.db.client().collection(collectionName);
		const product_collection = req.custom.db.client().collection("product");
		const adminmember_collection = req.custom.db.client().collection('adminmember')
		const category_collection = req.custom.db.client().collection('category')
		const local = req.custom.local;
	
		const order = await collection.findOne({_id: ObjectID(req.params.Id)});
	
		if (!order) {
			return res.out({
				"message": local.item_not_exists
			}, enums.status_message.VALIDATION_ERROR);
		}
	
		if (order.products.findIndex(p => p.sku === data.sku) > -1) {
			return res.out({
				"message": "Product already exists in the order"
			}, enums.status_message.VALIDATION_ERROR);
		}
	
	
		const sku = data.sku.includes('-') ? data.sku.split('-')[0] : data.sku;
		const product = await product_collection.findOne({ sku: sku }, { projection: {
			"_id": 1,
			"soft_code": 1,
			"sku": { $ifNull: [`$sku`, `$soft_code`] }, // TODO: Change to sku
			"name": 1,
			"categories": "$prod_n_categoryArr",
			"picture": 1,
			"price": 1,
			"exchange_with_points": 1,
			"points": 1,
			"old_price": 1,
			"uom": 1,
			"barcode": 1,
			"weight": 1,
			"prod_n_storeArr": 1,
			"supplier_id": 1,
			"variants": 1,
			"free_shipping": 1,
			"discount_price_valid_until": 1,
			"floor": 1,
			"rack_zone": 1,
			"barcode_2": 1,
			"options": 1,
			"max_quantity_cart": 1,
			"base_product": 1
		} });

		if (!product.prod_n_storeArr || product.prod_n_storeArr.findIndex(s => s.status && s.quantity > 0) < 0) {
			return res.out({
				"message": "No enough quantity"
			}, enums.status_message.VALIDATION_ERROR);
		}

		const price = parseFloat(product.price) * data.quantity;
	
		let order_product = { ...product, quantity: data.quantity, price: common.getFixedPrice(product.price), picture: common.picture_with_base(product.picture) };
	
		if (order_product.categories) {
			const categories = await category_collection.find({ _id: { $in: order_product.categories.map(c => ObjectID(c.category_id.toString())) } }).toArray();
			order_product.categories = order_product.categories.map((i) => {
				const cat_obj = categories.find((c) => c._id.toString() == i.category_id.toString());
				if (cat_obj) {
					const y = {};
					y._id = cat_obj._id;
					y.name = cat_obj.name;
					if (y._id && y.name) {
						return y;
					}
				}
			});
			order_product.categories = order_product.categories.filter((i) => i != null);
		} else {
			order.categories = [];
		}
	
		const total = parseFloat(order.total) + price;
		const subtotal = parseFloat(order.subtotal) + price;
	
		const admin = await adminmember_collection.findOne({_id: order.lastupdate_user});
	
		const update_by = req.custom.update_by != undefined ? req.custom.update_by : {
			_id: ObjectID(req.params.Id)
		};

		const products = [...order.products];
		products.push(order_product);
	
		const row = {
			$set: {
				products: products,
				subtotal: subtotal,
				total: total,
				lastupdate_user_name: admin ? admin.username : ''
			}
		};
	
		const response = await collection.updateOne(update_by, row);
	
		common.saveLog(req, 'add_product', 'order', ObjectID(req.params.Id), { ...order, ...row['$set'] }, order, { quantity: req.body.quantity }, req.body.employee_username, req.query);
		common.updateOrderEmployee(req, req.params.Id, req.params.soft_code, 'add_product');
		
		return res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED)
	} catch (error) {
		console.error(error);
		return res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR)
	}
			
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
		req.custom.clean_filter['request._id'] = ObjectID(req.query.order_id);
	}

	if (req.query.order_number) {
		req.custom.clean_filter['request.order_number'] = req.query.order_number;
	}

	if (req.query.iserror) {
		req.custom.clean_filter['response.iserror'] = parseInt(req.query.iserror);
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


const update_status_webhook = async (order_id, status) => {
	try {
		var config = {
			method: 'put',
			url: `https://jameia.co/api/app/order-status/?status=${status}&id=${order_id}`,
			headers: {
				'Content-Type': 'application/json',
				'app-key': '9cKkvPW6y9hpes0Q01ikfOkdwmpIc2T6r8OBmOjbapmwKw',
				  'app-secret': 'jNmZGUyZTJlpGRRyF35tti0BHkN64WI4AlxNXIxL45gX2i'
			},
		};
	
		const response = await axios(config);
		console.log(response.data);
	} catch (err) {
		console.error(err);
	}

}

const get_remote_order_number = async (order_id) => {
	var config = {
		method: 'get',
		url: `https://jameia.co/api/app/get_order_number/${order_id}`,
		headers: {
			'Content-Type': 'application/json',
			'app-key': '9cKkvPW6y9hpes0Q01ikfOkdwmpIc2T6r8OBmOjbapmwKw',
      		'app-secret': 'jNmZGUyZTJlpGRRyF35tti0BHkN64WI4AlxNXIxL45gX2i'
		},
	};

	const response = await axios(config);
	console.log('=============== GET ORDER NUMBER ', response.data, '===================');
	return response.data ? response.data.success : null;
}

const update_remote_order_address = async (order_id, data) => {
	var config = {
		method: 'put',
		url: `https://jameia.co/api/app/order-address/${order_id}`,
		headers: {
			'Content-Type': 'application/json',
			'app-key': '9cKkvPW6y9hpes0Q01ikfOkdwmpIc2T6r8OBmOjbapmwKw',
      		'app-secret': 'jNmZGUyZTJlpGRRyF35tti0BHkN64WI4AlxNXIxL45gX2i'
		},
		data
	};

	const response = await axios(config);
	console.log('=============== UPDATE REMOTE ORDER ADDRESS ', response.data, '===================');
	return response.data ? response.data.success : null;
}

const update_remote_order_delivery_time = async (order_id, delivery_time) => {
	var config = {
		method: 'put',
		url: `https://jameia.co/api/app/update-order/${order_id}?delivery_time=${delivery_time}`,
		headers: {
			'Content-Type': 'application/json',
			'app-key': '9cKkvPW6y9hpes0Q01ikfOkdwmpIc2T6r8OBmOjbapmwKw',
      		'app-secret': 'jNmZGUyZTJlpGRRyF35tti0BHkN64WI4AlxNXIxL45gX2i'
		},
	};

	const response = await axios(config);
	console.log('=============== UPDATE REMOTE ORDER DELIVERY TIME ', response.data, '===================');
	return response.data ? response.data.success : null;
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

/* function convertFieldsToNumbers(obj, fieldsToConvert) {
	if (typeof obj !== 'object') {
	  return obj;
	}
  
	if (Array.isArray(obj)) {
	  return obj.map((item) => convertFieldsToNumbers(item, fieldsToConvert));
	}
  
	const newObj = { ...obj };
  
	for (const key in newObj) {
	  if (fieldsToConvert.includes(key) && typeof newObj[key] === 'string') {
		newObj[key] = parseFloat(newObj[key]);
		if (isNaN(newObj[key])) {
		  newObj[key] = null; // Set to null if it couldn't be converted to a number
		}
	  } else {
		newObj[key] = convertFieldsToNumbers(newObj[key], fieldsToConvert);
	  }
	}
  
	return newObj;
  } */

function convertFields(obj) {
	if (obj.data && Array.isArray(obj.data)) {
		/* obj.data = obj.data.map(d => {
			return { ...d, products: d.products.map(p => ({...p, price: p.price.toString()})) }
		}); */
	const new_data = [];

	for (const d of obj.data) {
		if (d.products && d.products.length > 0) {
			const products = [];
			for (const p of d.products) {
				products.push({...p, price: p.price.toString()});
			}
			new_data.push({ ...d, products: products });
		}
	}

	obj.data = new_data;

	}
	if (obj.products && Array.isArray(obj.products)) {
		obj.products = obj.products.map(p => ({...p, price: p.price.toString()}))
	}
	if (obj.user_data && obj.user_data.wallet) obj.user_data.wallet = 0;
	return obj;
  }

  module.exports.make_orders_inserted = async function(req, res) {
	try {
		if (!req.body.orders || req.body.orders.length < 1 || req.body.orders.findIndex(o => !ObjectID.isValid(o)) > -1) {
			return res.out({ message: "Orders not valid" }, enums.status_message.VALIDATION_ERROR);
		}
	
		const collection = req.custom.db.client().collection(collectionName);
	
		await collection.updateMany({ _id: { $in: req.body.orders.map(o => ObjectID(o)) } }, { $set: { inserted_remotly: true } });
	
		return res.out({
			message: req.custom.local.saved_done
		}, enums.status_message.UPDATED);
	} catch (err) {
		return res.out({
			message: err.message
		}, enums.status_message.UNEXPECTED_ERROR);
	}

  }


  module.exports.update_all_statuses = async (req, res) => {
	try {
		console.log(req.body);
		req.custom.model = require('./models/update_all_statuses');
		const {
			data,
			error
		} = await req.custom.getValidData(req);
		if (error) {
			console.log(error);
			return res.out(error, enums.status_message.VALIDATION_ERROR);
		}

		console.log(data);


	  const collection = req.custom.db.client().collection("order");
	  const member_collection = req.custom.db.client().collection("member");
	  const point_transactions_collection = req.custom.db
		.client()
		.collection("point_transactions");
	  const point_history_collection = req.custom.db
		.client()
		.collection("point_history");
	  const refresh_collection = req.custom.db
		.client()
		.collection("refresh_juice_gift");
  
	  const update_quantity_arr = [4, 5, 6, 7, 8, 9, 11];
	  const all_orders_data = data.orders;
	  const orders = await collection
		.find({ _id: { $in: all_orders_data.map((od) => ObjectID(od.id)) } })
		.toArray();
  
	  if (all_orders_data.length !== orders.length) {
		console.error("different length");
		return res.out({}, enums.status_message.UNEXPECTED_ERROR);
	  }
  
	  for (const order_data of all_orders_data) {
		const promises = [];
		const order = orders.find((o) => o._id.toString() === order_data.id.toString());
		if (!order || order.status === order_data.status) {
			continue;
		};
  
		const user_info =
		  order && order.user_data && order.user_data._id
			? await member_collection
				.findOne({ _id: ObjectID(order.user_data._id.toString()) })
				.catch(() => null)
			: null;
  
		if (
		  order.order_number &&
		  parseInt(order_data.status) === 14 &&
		  !order_data.order_number
		) {
		  order_data.order_number = order.order_number;
		}
  
		if (order.order_number && parseInt(order_data.status) !== 14) {
		  order_data.order_number = order.order_number;
		}

		let data_to_update = {
			status: order_data.status,
			order_number: order_data.order_number,
		};

		if (order_data.employee_username) data_to_update.employee_username = order_data.employee_username;
		if (order_data.driver_username) data_to_update.driver_username = order_data.driver_username;
  
		promises.push(
		  collection.updateOne(
			{ _id: ObjectID(order_data.id) },
			{
			  $set: data_to_update,
			}
		  )
		);
  
		if (parseInt(order_data.status) !== 4) {
		  update_status_webhook(order_data.id, order_data.status);
		}
  
		// Order Completed 4
		// OR Request reversed 9
		if (
		  (parseInt(order_data.status) === 4 && order.status != 4) ||
		  (parseInt(order_data.status) === 9 && order.status === 4)
		) {
		  const is_canceled =
			parseInt(order_data.status) === 9 && order.status === 4;
  
		  if (order.user_data && order.user_data._id && user_info) {
			let points = parseInt(user_info.points || 0);
			let wallet = parseFloat(user_info.wallet || 0);
  
			// const new_points = order.total ? parseInt(order.total) : 0;
			const new_points =
			  order.payment_method.id === "knet"
				? parseInt(order.total) + parseInt(order.total) / 2
				: parseInt(order.total);
			if (new_points > 0) {
			  if (
				order.payment_method == "wallet" ||
				order.discount_by_wallet == true
			  ) {
				//wallet = user_info.wallet - wallet2money;
			  } else {
				let point_transaction_data = {
				  points: parseInt(new_points),
				  createdAt: common.getDate(),
				  expiresAt: moment(common.getDate()).add(9, "months").toDate(),
				  used: false,
				  trashed: false,
				};
				let point_history_data = {
				  order_id: ObjectID(order._id.toString()),
				  added_points: parseInt(new_points),
				  created: common.getDate(),
				  expiresAt: moment(common.getDate()).add(9, "months").toDate(),
				};
				let total_points = 0;
				if (order.points_transfer_mobile) {
				  const member = await member_collection.findOne({
					mobile: order.points_transfer_mobile,
				  });
				  total_points = is_canceled
					? parseInt(member.points || 0) - new_points
					: parseInt(member.points || 0) + new_points;
				  if (member) {
					point_transaction_data.member_id = ObjectID(
					  member._id.toString()
					);
					point_history_data = {
					  ...point_history_data,
					  member_id: ObjectID(member._id.toString()),
					  sender_id: ObjectID(order.user_data._id.toString()),
					  old_points: member.points || 0,
					  new_points: total_points,
					  old_wallet: common.getFixedPrice(member.wallet || 0),
					  new_wallet: common.getFixedPrice(member.wallet || 0),
					  notes: is_canceled
						? "canceled transfered order"
						: "Transferred",
					  type: is_canceled ? "canceled" : "transfered",
					};
					await member_collection.updateOne(
					  { _id: member._id },
					  { $set: { points: total_points } }
					);
				  }
				} else {
				  points = is_canceled
					? points - parseInt(new_points)
					: points + parseInt(new_points);
				  total_points = points;
				  point_transaction_data.member_id = ObjectID(
					order.user_data._id.toString()
				  );
				  point_history_data = {
					...point_history_data,
					member_id: ObjectID(order.user_data._id.toString()),
					old_points: user_info.points || 0,
					new_points: points,
					old_wallet: common.getFixedPrice(user_info.wallet || 0),
					new_wallet: common.getFixedPrice(wallet),
					notes: is_canceled ? "canceled order" : "Bonus from order",
					type: is_canceled ? "canceled" : "bonus",
				  };
				}
  
				promises.push(
				  point_transactions_collection.insertOne(point_transaction_data)
				);
  
				promises.push(
				  point_history_collection.insertOne(point_history_data)
				);
			  }
  
			  promises.push(
				member_collection.updateOne(
				  {
					_id: ObjectID(order.user_data._id.toString()),
				  },
				  {
					$set: {
					  points: points,
					  wallet: wallet,
					},
				  }
				)
			  );
			}
		  }
		}
  
		// Order Canceled 5
		else if (
		  parseInt(order_data.status) === 5 &&
		  order.status != 5 &&
		  parseFloat(order.discount_by_wallet_value) > 0
		) {
		  const wallet =
			parseFloat(user_info.wallet) +
			parseFloat(order.discount_by_wallet_value);
  
		  promises.push(
			member_collection.updateOne(
			  {
				_id: ObjectID(order.user_data._id.toString()),
			  },
			  {
				$set: {
				  wallet: wallet,
				},
			  }
			)
		  );
		}
  
		let message_body = null;
		let message_title = null;
		let is_wallet_notification = false;
  
		if (user_info && user_info.device_token) {
		  if (
			user_info.language &&
			["ar", "en"].indexOf(user_info.language) > -1
		  ) {
			req.custom.local = require(`../../i18n/${user_info.language}`);
		  }
  
		  // Order Processing 2
		  if (parseInt(order_data.status) === 2 && order.status != 2) {
			message_body = req.custom.local.order_notification_body_2;
			message_title = req.custom.local.order_notification_title_2;
		  }
		  // Order On the way 3
		  else if (parseInt(order_data.status) === 3 && order.status != 3) {
			message_body = req.custom.local.order_notification_body_3;
			message_title = req.custom.local.order_notification_title_3;
		  }
		  // Order Delivered 4
		  else if (parseInt(order_data.status) === 4 && order.status != 4) {
			message_body = req.custom.local.order_notification_body_4;
			message_title = req.custom.local.order_notification_title_4;
			is_wallet_notification = true;
		  }
		  // Order Canceled 5
		  else if (parseInt(order_data.status) === 5 && order.status != 5) {
			message_body = req.custom.local.order_notification_body_5;
			message_title = req.custom.local.order_notification_title_5;
		  }
		  // Order Disapproved 6
		  else if (parseInt(order_data.status) === 6 && order.status != 6) {
			message_body = req.custom.local.order_notification_body_6;
			message_title = req.custom.local.order_notification_title_6;
		  }
		  // Order Confirmed 7
		  else if (parseInt(order_data.status) === 7 && order.status != 7) {
			message_body = req.custom.local.order_notification_body_7;
			message_title = req.custom.local.order_notification_title_7;
		  }
		  // Order Returned 8
		  // else if (parseInt(order_data.status) === 8 && order.status != 8) {
		  // 	message_body = req.custom.local.order_notification_body_8;
		  // 	message_title = req.custom.local.order_notification_title_8;
		  // }
		  // Order Ready to pick 12
		  else if (parseInt(order_data.status) === 12 && order.status != 12) {
			message_body = req.custom.local.order_notification_body_12;
			message_title = req.custom.local.order_notification_title_12;
		  }
		  // Order Time is up 13
		  else if (parseInt(order_data.status) === 13 && order.status != 13) {
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
  
			promises.push(
			  common.send_to_multiple(
				message,
				device_tokens,
				is_wallet_notification
			  )
			);
		  }
		}
  
		if (update_quantity_arr.indexOf(order.status) > -1) {
		  return false;
		}
  
		if (order.status == 4) {
		  const exist_promo = await refresh_collection.findOne({
			member_id: order.user_data._id,
		  });
		  if (!exist_promo) {
			const coupon = create_coupon(req, order);
			const sms_text = req.custom.local.coupon_refresh_juice(coupon);
			promises.push(sendSms(order.user_data.mobile, sms_text));
			const refresh_juice_data = {
			  member_id: order.user_data._id,
			  created_at: new Date(),
			};
			promises.push(refresh_collection.insertOne(refresh_juice_data));
		  }
		}
  
		await Promise.all(promises);

	}
	
	return res.out({
		message: req.custom.local.saved_done
	}, enums.status_message.UPDATED);
	} catch (err) {
	  console.error("UPDATE STATUS ERROR: ", err);
	  return res.out({ message: err.message }, enums.status_message.UNEXPECTED_ERROR);
	}
  };
  