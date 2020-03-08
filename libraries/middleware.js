// Load required modules
const config = require('./config');
const cache = require('./cache');
const database = require('./database');
const enums = require('./enums');
const validateData = require('./validation');
const fs = require('fs');
const qs = require('qs');
const path = require('path');
const jwt = require('jsonwebtoken');
const ObjectID = require("mongodb").ObjectID;

/**
 * middleware to handle requests and responses
 * @param {object} req
 * @param {object} res
 * @param {function} next
 * @return {promise}
 */
module.exports = (req, res, next) => {
	res.out = (results, message = enums.status_message.DATA_LOADED) => {
		res.json(response(results, message));
	};
	if (config.env === 'production' && req.get('User-Agent').toLowerCase().match(config.denied_agents)) {
		return res.out({
			success: false,
			auth: false,
		});
	}
	return database.connect()
		.then(() => {
			req.custom = {};
			req.custom.config = config;
			req.custom.isAuthorized = true;
			req.custom.local = require(`../i18n/${config.local}`);
			let arr_path = req.path.split('/').slice(config.base_url_level);
			req.custom.path_url_arr = arr_path;
			req.custom.class = arr_path[0];
			req.custom.action = arr_path[1] || 'index';
		})
		.then(() => {
			req.custom.cache = cache;
			req.custom.db = database;
			req.custom.available_languages = fs.readdirSync(path.resolve('i18n')).map((lng) => lng.replace('.js', ''));
		})
		.then(() => checkpolicy(req, res)
			.then((usr) => {
				req.custom.authUser = usr;
			}).catch(e => {
				req.custom.isAuthorized = false;
				req.custom.UnauthorizedObject = e;
			}))
		.then(() => {
			const modelFile = path.resolve(`modules/${req.custom.class}/model.js`);
			req.custom.model = fs.existsSync(modelFile) ? require(modelFile) : {};
		})
		.then(() => {
			// Get sorting rules
			const query_sort = req.query.sort || '';
			const sort = qs.parse(query_sort, {
				allowDots: true
			});
			const model = req.custom.model;
			const model_keys = Object.keys(model);
			req.custom.clean_sort = {};
			if (Object.keys(sort).length > 0) {
				for (let k of model_keys) {
					let sort_val = sort[k];
					if (model[k]['isLang']) {
						k = `${k}.${config.local}`;
					}
					if (sort_val && (['asc', 'desc'].indexOf(sort_val) > -1 || [1, -1].indexOf(parseInt(sort_val)) > -1)) {
						if (sort_val === 'asc') {
							sort_val = 1;
						} else if (sort_val === 'desc') {
							sort_val = -1;
						}
						sort_val = parseInt(sort_val);
						if ([1, -1].indexOf(sort_val) > -1) {
							req.custom.clean_sort[k] = sort_val;
						}
					}
				}
			} else {
				req.custom.clean_sort = {
					_id: -1
				};
			}
		})
		.then(() => {
			const query_filter = req.query.filter || '';
			req.custom.clean_filter = {};
			if (!query_filter) {
				return;
			}
			const filter = qs.parse(query_filter, {
				allowDots: true
			});
			const model = Object.assign(req.custom.model);
			const model_keys = Object.keys(model);
			if (Object.keys(filter).length > 0) {
				if (req.method === 'GET' && req.query._id) {
					model._id = {
						"type": ObjectID
					};
				}
				for (let k of model_keys) {
					let filter_val = filter[k];
					if (filter_val) {
						if (model[k]['isLang']) {
							req.custom.clean_filter[`${k}.${config.local}`] = {
								"$regex": filter_val
							};
						} else {
							switch (model[k].type) {
								case Number:
									if (Number(filter_val) !== NaN) {
										filter_val = parseInt(filter_val);
									}
									break;
								case Boolean:
									if (['true', 'false'].indexOf(filter_val) > -1) {
										filter_val = filter_val == 'true';
									}
									break;

								case String:
									filter_val = {
										"$regex": filter_val.trim()
									};
									break;

								case ObjectID:
									if (ObjectID.isValid(filter_val)) {
										filter_val = ObjectID(filter_val);
									}
									break;

								default:
									break;
							}
							req.custom.clean_filter[k] = filter_val == 'null' ? {
								"$eq": null
							} : filter_val;
						}
					}
				}
			}
		})
		.then(() => {
			req.custom.limit = parseInt(req.query.limit || config.db.limit);
		})
		.then(() => {
			req.custom.skip = req.custom.limit * parseInt(req.query.skip - 1 || 0);
		})
		.then(() => {
			req.custom.getValidData = validateData;
		})

		.then(next)
		.catch((e) => console.log(e));
};
/**
 * check permissions
 * @param {object} req
 * @param {object} res
 */
function checkpolicy(req, res) {
	return new Promise((resolve, reject) => {
		if (req.custom.class === 'auth' && req.custom.action === 'login') {
			resolve(true);
		}
		const config = req.custom.config;
		const local = req.custom.local;
		const token = req.headers['authorization'].replace('Bearer ', '');
		if (!token) {
			reject({
				success: false,
				auth: false,
				message: local.no_token
			});
		}
		jwt.verify(token, config.secret, function (err, decoded) {
			if (err) {
				reject({
					success: false,
					auth: false,
					message: local.failed_auth
				});
			}
			resolve(decoded);
		});
	});
}

function response(results, message = enums.status_message.DATA_LOADED) {
	let code = 200;
	if ([enums.status_message.AUTHORIZED, enums.status_message.CREATED, enums.status_message.DATA_LOADED, enums.status_message.DELETED, enums.status_message.NO_DATA, enums.status_message.UPDATED].indexOf(message) > -1) {
		code = 200;
	} else if ([enums.status_message.UNAUTHENTICATED].indexOf(message) > -1) {
		code = 401;
	} else if ([enums.status_message.FORBIDDEN, enums.status_message.UNAUTHORIZED].indexOf(message) > -1) {
		code = 403;
	} else if ([enums.status_message.NOT_FOUND].indexOf(message) > -1) {
		code = 404;
	} else if ([enums.status_message.VALIDATION_ERROR, enums.status_message.INVALID_APP_AUTHENTICATION, enums.status_message.RESOURCE_EXISTS, enums.status_message.INVALID_USER_AUTHENTICATION, enums.status_message.INVALID_URL_PARAMETER, enums.status_message.CITY_REQUIRED, enums.status_message.UNEXPECTED_ERROR].indexOf(message) > -1) {
		code = 500;
	}
	return {
		success: code === 200,
		status_code: code,
		status_message: message,
		errors: code !== 200 ? results : null,
		results: code === 200 ? results : null,
	};
}