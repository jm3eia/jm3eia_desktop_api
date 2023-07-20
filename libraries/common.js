// Load required modules
const moment = require('moment');
const request = require("request");
const Decimal = require('mongodb').Decimal128;
const ObjectID = require('mongodb').ObjectID;

const parseArabicNumbers = function (str) {
	return str ? (str.toString().replace(/[٠١٢٣٤٥٦٧٨٩]/g, function (d) {
		return d.charCodeAt(0) - 1632;
	}).replace(/[۰۱۲۳۴۵۶۷۸۹]/g, function (d) {
		return d.charCodeAt(0) - 1776;
	})).toString() : null;
}
module.exports.parseArabicNumbers = parseArabicNumbers;

module.exports.getRoundedPrice = function (price) {
	return price > 0 ? (Math.ceil(parseFloat(parseArabicNumbers(price)) * 200) / 200).toFixed(3) : '0.000';
}

module.exports.getFixedPrice = function (price) {
	return parseFloat(price || 0) ? parseFloat(parseArabicNumbers(price)).toFixed(3) : '0.000';
}

module.exports.getDecimalPrice = function (price) {
	return Decimal.fromString(price);
}

module.exports.getDate = function (date = null, local = 'en') {
	moment.updateLocale(local, {});
	return new Date(date ? moment(date).add(parseInt(process.env.DATE_UTC), 'hours') : moment().add(parseInt(process.env.DATE_UTC), 'hours'));
}

module.exports.group_products_by_suppliers = (products, req) => {
	return products.reduce((prod, curr) => {
		curr.supplier_id = curr.supplier_id || req.custom.settings.site_name[req.custom.lang];
		prod[curr.supplier_id] = prod[curr.supplier_id] || [];
		prod[curr.supplier_id].push(curr);
		return prod;
	}, {});
}

module.exports.is_numeric = function (str) {
	return /^-?\d+$/.test(str);
}

module.exports.saveLog = async (req, action, model, document_id, newData = {}, oldData = {}, body = {}, username = null, query = {}) => {
	try {
		const log_collection = req.custom.db.client().collection('employee_logs');
		const logRecord = {
			action: action,
			url: req.originalUrl,
			collection: model,
			user_id: ObjectID(req.custom.authUser && req.custom.authUser.employee ? req.custom.authUser.userId : document_id.toString()),
			employee_username: req.custom.authUser && req.custom.authUser.employee ? req.custom.authUser.username : username,
			document_id: document_id || null,
			old_data: Object.keys(oldData).length > 0 ? oldData : null,
			new_data: Object.keys(newData).length > 0 ? newData : null,
			body: Object.keys(body).length > 0 ? body : null,
			query: Object.keys(query).length > 0 ? query : null,
			created: this.getDate()
		};

		if (req.custom.authUser && req.custom.authUser.employee && username) {
			logRecord.store_manager_username = logRecord.employee_username;
			logRecord.employee_username = username;
		}

		await log_collection.insertOne(logRecord);
	} catch (err) {
		console.error('Error logging update: ', err);
	}

}

module.exports.getAdjustedDate = (dateStr) => {
	const date = new Date(dateStr);
	const timezoneOffset = date.getTimezoneOffset() * 60000;
	const adjusted_date = new Date(date.getTime() - timezoneOffset);
	return adjusted_date;
}

module.exports.updateOrderEmployee = async (req, orderId, sku, action) => {
	if (!orderId || !ObjectID.isValid(orderId)) return;
	const data = {};
	if (req.custom.authUser && req.custom.authUser.employee) {
		if (req.custom.authUser.department === 3)
			data.store_manager_username = req.custom.authUser.username;
		else
			data.employee_username = req.custom.authUser.username;

	}
	try {
		const collection = req.custom.db.client().collection('order');
		if (sku) {
			const order = await collection.findOne({ _id: ObjectID(orderId), 'data.products.soft_code': sku });

			if (!order) {
				return;
			}

			order.data.forEach((orderData) => {
				const productToUpdate = orderData.products.find((product) => product.soft_code === sku);
				if (productToUpdate) {
					if (req.custom.authUser.department === 3) productToUpdate.store_manager = req.custom.authUser.username;
					if (action) productToUpdate.action = action;
				}
			});

			await collection.updateOne({ _id: ObjectID(orderId) }, { $set: { data: order.data, ...data } });
		} else {
			const collection = req.custom.db.client().collection('order');
			await collection.updateOne({ _id: ObjectID(orderId) }, {
				$set: data
			})
		}
	} catch (error) {
		console.error('Error updating order employee:', error);
	}
}

function send_to_multiple(message, device_tokens, wallet = false) {
	const body = {
		"registration_ids": device_tokens,
		"notification": {
			"body": message.body,
			"title": message.title
		},
		"priority": "high",
		"data": {
			"click_action": "FLUTTER_NOTIFICATION_CLICK",
			"url": message.url,
			"wallet": wallet,
			"id": "1",
			"status": "done"
		}
	};
	const headers = {
		'Content-Type': 'application/json',
		Authorization: `key=${process.env.FIREBASE_API_KEY}`
	}
	return call_api(`https://fcm.googleapis.com/fcm/send`, 'POST', body, headers);
}


function notify_store_managers(message, device_tokens, data) {
	const body = {
		"registration_ids": device_tokens,
		"notification": {
			"body": message.body,
			"title": message.title
		},
		"priority": "high",
		"data": {
			"click_action": "FLUTTER_NOTIFICATION_CLICK",
			...data
		}
	};
	const headers = {
		'Content-Type': 'application/json',
		Authorization: `key=${process.env.SECOND_FIREBASE_API_KEY}`
	}
	return call_api(`https://fcm.googleapis.com/fcm/send`, 'POST', body, headers);
}

function call_api(url, method = 'GET', body = {}, headers = {}) {
	headers = headers || {}
	headers['User-Agent'] = 'Notification Services';
	headers['Language'] = process.env.API_LANGUAGE;

	if (!headers['Authorization']) {
		headers['Authorization'] = `Bearer ${this.token}`;
	}

	return new Promise((resolve, reject) => {
		var options = {
			method: method,
			url: url,
			headers: headers,
			body: body,
			json: true
		};
		request(options, function (error, response, body) {
			if (error) {
				reject(error);
			} else {
				resolve(body);
			}
		});

	});
}

module.exports.send_to_multiple = send_to_multiple;
module.exports.notify_store_managers = notify_store_managers;
