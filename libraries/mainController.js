const ObjectID = require("mongodb").ObjectID;
const enums = require("../libraries/enums");

/**
 * Create new record
 * @param {Object} req
 * @param {Object} res
 */
module.exports.create = async function (req, res, collectionName) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;
	const {
		data,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	req.custom.cache.unset(collectionName).catch(() => { });
	collection.insertOne(data)
		.then((response) => res.out({
			message: local.saved_done,
			insertedId: response.insertedId
		}, enums.status_message.CREATED))
		.catch((error) => res.out({
			'message': error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Update record
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = async function (req, res, collectionName, callback) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	if (req.params.Id && !ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}
	const collection = req.custom.db.client().collection(collectionName);
	const local = req.custom.local;
	const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	data.lastUser_update = ObjectID(req.custom.authUser.userId);
	const row = {
		$set: data
	};
	if (Object.keys(unset).length > 0) {
		row["$unset"] = unset;
	}
	req.custom.cache.unset(collectionName).catch(() => { });
	const update_by = req.custom.update_by != undefined ? req.custom.update_by : {
		_id: ObjectID(req.params.Id)
	};
	collection.updateOne(update_by, row)
		.then((response) => {
			res.out({
				message: local.saved_done
			}, enums.status_message.UPDATED)

			if (callback) {
				callback(response);
			}
		})
		.catch((error) => res.out({
			message: error.message
		}, enums.status_message.UNEXPECTED_ERROR));
};

/**
 * Delete record
 * @param {Object} req
 * @param {Object} res
 */
module.exports.delete = function (req, res, collectionName) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	if (!ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}
	const collection = req.custom.db.client().collection(collectionName);
	const where = {
		_id: ObjectID(req.params.Id)
	};
	req.custom.cache.unset(collectionName).catch(() => { });
	collection.deleteOne(where, function (err, result) {
		if (err) {
			return res.out({
				message: err.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}
		res.out({
			message: req.custom.local.deleted_done
		}, enums.status_message.DELETED);
	});
};

/**
 * List all records
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = function (req, res, collectionName, projection = {}, callback = null) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	const collection = req.custom.db.client().collection(collectionName);
	collection.count(req.custom.clean_filter, (err, total) => {
		if (err) {
			return res.out({
				message: err.message
			}, enums.status_message.UNEXPECTED_ERROR);
		}
		if (total === 0) {
			return res.out({
				count: 0,
				total: 0,
				links: [],
				data: []
			}, enums.status_message.NO_DATA);
		}
		collection
			.find(req.custom.clean_filter, {
				projection: projection
			})
			.sort(req.custom.clean_sort)
			.limit(req.custom.limit)
			.skip(req.custom.skip)
			.toArray(function (err, docs) {
				if (err) {
					return res.out({
						message: err.message
					}, enums.status_message.UNEXPECTED_ERROR);
				}
				const out = {
					total: total,
					count: docs.length,
					per_page: req.custom.limit,
					current_page: req.query.skip || 1,
					data: docs
				};
				if (callback) {
					callback(out);
				} else {
					res.out(out);
				}
			});
	});
};

/**
 * Read record by id
 * @param {Object} req
 * @param {Object} res
 */
module.exports.read = function (req, res, collectionName, callback) {
	if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	let where = {
		_id: ObjectID(req.params.Id)
	};
	if (!ObjectID.isValid(req.params.Id) && req.custom.where_property) {
		where = {
			[req.custom.where_property]: req.params.Id
		}
	} else {
		return res.out({
			message: req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}

	const collection = req.custom.db.client().collection(collectionName);
	collection.findOne(where, function (err, doc) {
		if (!doc) {
			return res.out({}, enums.status_message.NO_DATA);
		}
		req.custom.db.client().collection('adminmember').findOne({
			_id: doc.lastupdate_user
		}, function (err, usr) {
			doc.lastupdate_user_name = usr ? usr.username : '';
			if (callback) {
				callback(doc);
			} else {
				res.out(doc);
			}
		});
	});
};
