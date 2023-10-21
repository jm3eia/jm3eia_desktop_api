// Auth Controller

// Load required modules
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const ObjectID = require("mongodb").ObjectID;
const enums = require('../../libraries/enums');
const md5 = require('md5');
const uuid = require('uuid/v1');

/**
 * Create new auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.create = function (req, res) {
	const collection = req.custom.db.client().collection('application');
	const config = req.custom.config;
	const local = req.custom.local;
	const appId = randId(10000, 99999);
	const appSecret = uuid().replace(/-/g, '') + uuid().replace(/-/g, '');
	const hashedPassword = bcrypt.hashSync(appSecret, 8);
	const data = {
		name: req.body.name,
		appId: appId,
		appSecret: hashedPassword
	};
	collection.insertOne(data)
		.then(() => {
			res.out({
				'message': true,
				data: {
					appId: appId,
					appSecret: appSecret
				}
			});
		})
		.catch(() => res.out({
			message: local.failed_create_auth_app
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Check auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = function (req, res) {
	const usercollection = req.custom.db.client().collection('adminmember');
	const config = req.custom.config;
	const local = req.custom.local;
	const query = {
		email: req.body.email
	};

	usercollection.findOne(query).then((theuser) => {
		bcrypt.compare(req.body.password, theuser.password, function (err, valid) {
			if (err || !valid) {
				return res.out({
					error: local.failed_auth_user
				}, enums.status_message.UNEXPECTED_ERROR);
			}
			// create a token
			var token = jwt.sign({
				userId: theuser._id,
				country_id: ObjectID(theuser.country_id)
			}, config.secret, {
				expiresIn: 3600 * 24 * 365 * 2 // expires in 1 hour
			});
			delete theuser.password;
			theuser.hash_email = md5(theuser.email);
			res.out({
				auth: true,
				token: token,
				user: theuser
			});
		});
	}).catch(() => res.out({
		error: local.failed_auth_user
	}, enums.status_message.UNEXPECTED_ERROR));

};

/**
 * Get auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = function (req, res) {
	const collection = req.db.client().collection('application');
	const config = req.custom.config;
	const local = req.custom.local;
	var token = req.headers['authorization'];
	if (!token)
		return res.out({
			auth: false,
			message: local.no_token
		}, enums.status_message.UNAUTHENTICATED);

	jwt.verify(token, config.secret, function (err, decoded) {
		if (err)
			return res.out({
				auth: false,
				message: local.failed_auth
			}, enums.status_message.UNEXPECTED_ERROR);

		res.out(decoded);
	});
};

/**
 * Generate random integer id
 * @param {Number} min
 * @param {Number} max
 * @returns {string}
 */
function randId(min, max) {
	return (new Date().getTime()).toString() + (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}