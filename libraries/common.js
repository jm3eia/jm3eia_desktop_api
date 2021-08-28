// Load required modules
const moment = require('moment');
const request = require("request");
const Decimal = require('mongodb').Decimal128;

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


function send_to_multiple(message, device_tokens) {
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
			"id": "1",
			"status": "done"
		}
	};
	this.headers = {
		'Content-Type': 'application/json',
		Authorization: `key=${process.env.FIREBASE_API_KEY}`
	}
	return call_api(`https://fcm.googleapis.com/fcm/send`, 'POST', body);
}

function call_api(url, method = 'GET', body = {}) {
	this.headers = this.headers || {}
	this.headers['User-Agent'] = 'Notification Services';
	this.headers['Language'] = process.env.API_LANGUAGE;

	if (!this.headers['Authorization']) {
		this.headers['Authorization'] = `Bearer ${this.token}`;
	}

	return new Promise((resolve, reject) => {
		var options = {
			method: method,
			url: url,
			headers: this.headers,
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
