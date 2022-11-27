// Products Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");
const common = require("../../libraries/common");
const moment = require('moment');
const mainController = require("../../libraries/mainController");
const collectionName = "member";

/**
 * Update quantities of product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.points = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/points');

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection('member');
	const points_history_collection = req.custom.db.client().collection('point_history');
	collection.findOne({
		_id: ObjectID(req.body.member_id),
	}, async function (err, doc) {
		let _promise = Promise.resolve(true);
		if (doc) {
			if (parseFloat(doc.points) != parseFloat(req.body.points)) {
				const point_transactions_data = {
					member_id: ObjectID(req.body.member_id.toString()),
					points: parseInt(req.body.points),
					createdAt: common.getDate(),
					expiresAt: moment(common.getDate()).add(9, 'months').toDate(),
					used: false,
					trashed: false
				};
				req.body.points += parseFloat(doc.points || 0);
				const points_data = {
					"member_id": ObjectID(req.body.member_id.toString()),
					"old_points": common.getFixedPrice(doc.points),
					"new_points": common.getFixedPrice(req.body.points),
					"old_wallet": common.getFixedPrice(doc.wallet),
					"new_wallet": common.getFixedPrice(doc.wallet),
					"notes": req.body.notes,
					"type": "updated",
					"created": new Date(),
				};
				_promise = points_history_collection.insertOne(points_data);

				const point_transactions_collection = req.custom.db.client().collection('point_transactions');
				await point_transactions_collection.insertOne(point_transactions_data).catch((err) => { console.log('Points transaction error: ', err) });

				await collection.updateOne({
					_id: ObjectID(req.body.member_id.toString())
				}, {
					$set: {
						points: parseFloat(req.body.points)
					}
				});

			}
		}
		_promise.catch(() => null).then(() => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED));
	});

};


/**
 * Update quantities of product
 * @param {Object} req
 * @param {Object} res
 */
module.exports.wallet = async (req, res) => {

	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}

	req.custom.model = require('./models/wallet');

	const local = req.custom.local;

	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}

	const collection = req.custom.db.client().collection('member');
	const wallet_history_collection = req.custom.db.client().collection('wallet_history');
	collection.findOne({
		_id: ObjectID(req.body.member_id),
	}, async function (err, doc) {
		let _promise = Promise.resolve(true);
		if (doc) {
			if (parseFloat(doc.wallet) != parseFloat(req.body.wallet)) {
				req.body.wallet = parseFloat(req.body.wallet) + parseFloat(doc.wallet || 0);
				const wallet_data = {
					"member_id": ObjectID(req.body.member_id.toString()),
					"old_wallet": common.getFixedPrice(doc.wallet),
					"new_wallet": common.getFixedPrice(req.body.wallet),
					"notes": req.body.notes,
					"type": "updated",
					"created": new Date(),
				};
				_promise = wallet_history_collection.insertOne(wallet_data);

				await collection.updateOne({
					_id: ObjectID(req.body.member_id.toString())
				}, {
					$set: {
						wallet: parseFloat(req.body.wallet)
					}
				});

			}
		}
		_promise.catch(() => null).then(() => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED));
	});

};

module.exports.list = async (req, res) => {
	projection = {
		_id: 1,
		fullname: 1,
		username: 1,
		mobile: 1,
		email: 1,
		points: 1,
		wallet: 1,
		created: 1,
		status: 1,
		language: 1,
		address: 1
	};
	mainController.list(req, res, collectionName, projection);
}
