// Products Controller

// Load required modules
const ObjectID = require('mongodb').ObjectID;
const enums = require("../../libraries/enums");

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
	}, function (err, doc) {
		let _promise = Promise.resolve(true);
		if (doc) {
			if (parseFloat(doc.wallet) != parseFloat(req.body.wallet)) {
				req.body.wallet += parseFloat(doc.wallet);
				const wallet_data = {
					"member_id": ObjectID(req.params.Id.toString()),
					"old_wallet": parseFloat(doc.wallet),
					"new_wallet": parseFloat(req.body.wallet),
					"notes": req.body.notes,
				};
				_promise = wallet_history_collection.insertOne(wallet_data);
			}
		}
		_promise.catch(() => null).then(() => res.out({
			message: local.saved_done
		}, enums.status_message.UPDATED));
	});

};
