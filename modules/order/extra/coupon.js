const shortid = require('shortid');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-');
const { getDate } = require("../../../libraries/common");


function get_remote_token(req) {
	if (
		!req.custom.config.refresh_juice.app_id ||
		!req.custom.config.refresh_juice.app_secret ||
		!req.custom.config.refresh_juice.email ||
		!req.custom.config.refresh_juice.password
	) {
		return false;
	}
	var data = JSON.stringify({
		"appId": req.custom.config.refresh_juice.app_id,
		"appSecret": req.custom.config.refresh_juice.app_secret,
		"email": req.custom.config.refresh_juice.email,
		"password": req.custom.config.refresh_juice.password,
	});

	var config = {
		method: 'post',
		url: `${req.custom.config.refresh_juice.base_url}/auth/login`,
		headers: {
			'Content-Type': 'application/json',
			'Language': 'en'
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

exports.create_coupon = function (req, p, data) {
	const code = "RJ" + shortid.generate().toUpperCase();
	data = {
		"name": "jm3eia_offer_" + code,
		"code": code,
		"discount_value": 0,
		"member_ids": [],
		"max_uses": 1,
		"max_uses_per_user": 1,
		"number_of_uses": 0,
		"percent_value": "50",
		"valid_until": getDate(moment().add(1, 'M')),
		"apply_on_discounted_products": false,
		"status": true
	};

	data = JSON.stringify(data);

	var config = {
		method: 'POST',
		url: `${req.custom.config.refresh_juice.base_url}/coupon`,
		headers: {
			'Accept': 'application/json',
			'Language': 'en',
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		data: data
	};

	return axios(config)
		.then(() => code)
		.catch(function (error) {
			console.log(error);
			return null;
		});
}