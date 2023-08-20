const md5 = require("md5");
const sha1 = require("sha1");
const jwt = require('jsonwebtoken');
const ObjectID = require("mongodb").ObjectID;
const enums = require('../../libraries/enums');
const common = require("../../libraries/common");
const mainController = require("../../libraries/mainController");
const collectionName = "employee";


/**
 * Create new employee
 * @param {Object} req
 * @param {Object} res
 */
module.exports.create = (req, res) => {
    if (req.body.password) {
        req.body.password = sha1(md5(req.body.password));
    }

    let isValid = true;

    if (req.body.working_times) {
        if (req.body.working_times.from && !isValidTime(req.body.working_times.from)) isValid = false;
        if (req.body.working_times.to && !isValidTime(req.body.working_times.to)) isValid = false;

        if (!isEndTimeAfterStartTime(req.body.working_times.from, req.body.working_times.to)) isValid = false;
    }

    if (!isValid) {
        return res.out({ 'message': 'Please enter a valid working times.' }, enums.status_message.VALIDATION_ERROR);
    }
    mainController.create(req, res, collectionName);
};

/**
 * Update employee
 * @param {Object} req
 * @param {Object} res
 */
module.exports.update = (req, res) => {
    if (req.body.password) {
        req.body.password = sha1(md5(req.body.password));
    } else {
        delete req.custom.model.password;
    }

    let isValid = true;

    if (req.body.working_times) {
        if (req.body.working_times.from && !isValidTime(req.body.working_times.from)) isValid = false;
        if (req.body.working_times.to && !isValidTime(req.body.working_times.to)) isValid = false;

        if (!isEndTimeAfterStartTime(req.body.working_times.from, req.body.working_times.to)) isValid = false;
    }

    if (!isValid) {
        return res.out({ 'message': 'Please enter a valid working times.' }, enums.status_message.VALIDATION_ERROR);
    }
    mainController.update(req, res, collectionName);
};


/**
 * Update employee
 * @param {Object} req
 * @param {Object} res
 */
module.exports.updatePassword = (req, res) => {
    if (!req.custom.authUser || !req.custom.authUser.employee) {
        const local = req.custom.local;
        return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
    }

    if (!req.body.password) {
        return res.out({ message: 'Password is required.' }, enums.status_message.VALIDATION_ERROR);
    }

    req.custom.model = require('./models/update_password');

    req.params.Id = req.custom.authUser.userId;

    req.body.password = sha1(md5(req.body.password));

    mainController.update(req, res, collectionName);
};

/**
 * Delete employee
 * @param {Object} req
 * @param {Object} res
 */
module.exports.delete = (req, res) => {
    mainController.delete(req, res, collectionName);
};


/**
 * List employees
 * @param {Object} req 
 * @param {Object} res 
 */
module.exports.list = async (req, res) => {
    projection = {
        _id: 1,
        name: 1,
        username: 1,
        mobile: 1,
        created: 1,
        department: 1,
        store_id: 1,
        working_times: 1,
        status: 1,
    };
    mainController.list(req, res, collectionName, projection);
}

/**
 * Get employee by id
 * @param {Object} req 
 * @param {Object} res 
 */
module.exports.read = async (req, res) => {
    mainController.read(req, res, collectionName, (doc) => {
        delete doc.password;
        return res.out(doc);
    });
}


/**
 * Check auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.login = function (req, res) {
    const collection = req.custom.db.client().collection(collectionName);
    const config = req.custom.config;
    const local = req.custom.local;
    const query = {
        username: { $regex: new RegExp('^' + req.body.username + '$', 'i') },
        password: sha1(md5(req.body.password)),
    };
    collection.findOne(query).then(async (theuser) => {

        if (!theuser) {
            return res.out({
                error: local.failed_auth_user
            }, status_message.UNEXPECTED_ERROR);
        }

        if (theuser.working_times) {
            const currentTime = new Date();
            if (!common.isWithinWorkingTime(theuser.working_times, currentTime)) {
                return res.out({ message: `You cannot login outside your working times. ${theuser.working_times.from ? (' Please try again at ' + theuser.working_times.from) : ''})` }, enums.status_message.UNAUTHORIZED);
            }
        }


        var token = jwt.sign({
            userId: theuser._id,
            employee: true,
            department: theuser.department,
            username: theuser.username,
            country_id: ObjectID(theuser.country_id),
            working_times: theuser.working_times
        }, config.secret, {
            expiresIn: 3600 * 24
        });
        delete theuser.password;
        theuser.hash_username = md5(theuser.username);

        await collection.updateOne({ _id: ObjectID(theuser._id.toString()) }, { $set: { token_status: 1 } });

        await common.saveLog(req, 'login', 'employee', theuser._id, undefined, undefined, undefined, theuser.username);

        res.out({
            auth: true,
            token: token,
            user: theuser
        });

    }).catch(() => res.out({
        error: local.failed_auth_user
    }, enums.status_message.UNEXPECTED_ERROR));

};

/**
 * Logout
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logout = (req, res) => {
    const config = req.custom.config;
    const local = req.custom.local;
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
    if (!token)
        return res.out({
            auth: false,
            message: local.no_token
        }, enums.status_message.UNAUTHENTICATED);


    jwt.verify(token, config.secret, async function (err, decoded) {
        if (err)
            return res.out({
                auth: false,
                message: local.failed_auth
            }, status_message.UNEXPECTED_ERROR);

        const collection = req.custom.db.client().collection(collectionName);

        if (req.body.employees && req.body.employees.length > 0 && !decoded.employee) {
            await collection.updateMany({ _id: { $in: req.body.employees.map(e => ObjectID(e)) } }, { $set: { token_status: 0 } });
            return res.out({
                message: local.logout_done
            });
        }

        if (decoded.employee) {
            await collection.updateOne({ _id: ObjectID(theuser._id.toString()) }, { $set: { token_status: 0 } });
            await common.saveLog(req, 'logout', 'employee', ObjectID(decoded.userId), undefined, undefined, undefined, decoded.username);
        } else {
            return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
        }


        //return res.out({ message: err.message }, enums.status_message.UNEXPECTED_ERROR);
    });

};

/**
 * Get auth
 * @param {Object} req
 * @param {Object} res
 */
module.exports.me = function (req, res) {
    const config = req.custom.config;
    const local = req.custom.local;
    const token = req.headers['authorization'] ? req.headers['authorization'].replace('Bearer ', '') : null;
    if (!token)
        return res.out({
            auth: false,
            message: local.no_token
        }, enums.status_message.UNAUTHENTICATED);

    jwt.verify(token, config.secret, function (err, decoded) {
        if (err) {
            return res.out({
                auth: false,
                message: local.failed_auth
            }, status_message.UNEXPECTED_ERROR);
        }

        if (!decoded.employee) {
            return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
        }

        req.params.Id = decoded.userId;
        mainController.read(req, res, collectionName, (doc) => {
            delete doc.password;
            return res.out(doc);
        });
    });
};

/**
 * List Employee Logs
 * @param {Object} req
 * @param {Object} res
 */
module.exports.logs = (req, res) => {
    /* if (req.custom.authUser.employee) {
        req.custom.clean_filter['user_id'] = ObjectID(req.custom.authUser.userId);
    } */

    if (req.query.filter && req.query.filter.from_date && req.query.filter.to_date) {
        req.custom.clean_filter['created'] = {
            "$gte": common.getAdjustedDate(req.query.filter.from_date),
            "$lte": common.getAdjustedDate(req.query.filter.to_date)
        };
    } else {
        if (req.query.filter && req.query.filter.from_date) {
            req.custom.clean_filter['created'] = { "$gte": common.getAdjustedDate(req.query.filter.from_date) };
        }

        if (req.query.filter && req.query.filter.to_date) {
            req.custom.clean_filter['created'] = { "$lte": common.getAdjustedDate(req.query.filter.to_date) };
        }
    }


    if (req.query.action) {
        if (Array.isArray(req.query.action)) {
            req.custom.clean_filter['action'] = { "$in": req.query.action };
        } else {
            req.custom.clean_filter['action'] = req.query.action;
        }
    }

    if (req.query.username) {
        req.custom.clean_filter['employee_username'] = req.query.username;
    }

    if (req.query.order_id && ObjectID.isValid(req.query.order_id)) {
        req.custom.clean_filter['document_id'] = ObjectID(req.query.order_id);
    }

    if (req.query.order_number) {
        req.custom.clean_filter['$or'] = [
            { 'body.order_number': req.query.order_number },
            { 'new_data.order_number': req.query.order_number },
            { 'old_data.order_number': req.query.order_number },
            { 'query.order_number': req.query.order_number },
        ];
    }

    mainController.list(req, res, 'employee_logs', {
        "action": 1,
        "url": 1,
        "collection": 1,
        "user_id": 1,
        "employee_username": 1,
        "document_id": 1,
        "old_data": 1,
        "new_data": 1,
        'body': 1,
        'query': 1,
        "created": 1
    })
};



module.exports.stats = async (req, res) => {
    const filter = {};
    if (req.custom.authUser && req.custom.authUser.employee) {
        filter['user_id'] = ObjectID(req.custom.authUser.userId);
    }

    if (req.query.filter && req.query.filter.from_date && req.query.filter.to_date) {
        filter['created'] = {
            "$gte": common.getAdjustedDate(req.query.filter.from_date),
            "$lte": common.getAdjustedDate(req.query.filter.to_date)
        };
    } else {
        if (req.query.filter && req.query.filter.from_date) {
            filter['created'] = { "$gte": common.getAdjustedDate(req.query.filter.from_date) };
        }

        if (req.query.filter && req.query.filter.to_date) {
            filter['created'] = { "$lte": common.getAdjustedDate(req.query.filter.to_date) };
        }
    }

    if (req.query.username) {
        filter['employee_username'] = req.query.username;
    }

    const collection = req.custom.db.client().collection('employee_logs');

    filter['action'] = { $in: ['pickup', 'done'] };

    const pipeline = [
        { $match: filter },
        { $unwind: '$old_data' },
        {
            $group: {
                _id: '$action',
                totalProducts: { $sum: { $size: '$old_data.products' } }
            }
        },
        { $match: { _id: { $in: ['pickup', 'done'] } } },
        { $project: { _id: 0, action: '$_id', totalProducts: 1 } }
    ];

    const result = await collection.aggregate(pipeline).toArray();

    return res.out(result);
}


/**
 * Add new device
 * @param {Object} req
 * @param {Object} res
 */
module.exports.add_device = async function (req, res) {
    if (!req.custom.authUser || !req.custom.authUser.employee) {
        const local = req.custom.local;
        return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
    }
    req.custom.model = require('./models/add_device_token');

    req.custom.update_by = {
        _id: ObjectID(req.custom.authUser.userId.toString()),
    }

    mainController.update(req, res, collectionName);
};


module.exports.getSkippedProducts = async (req, res) => {
    req.custom.clean_filter = { action: 'skip' };
    req.custom.limit = 10000;

    mainController.list(req, res, 'order_products_actions', {}, (out) => {
        out.data = out.data.map(d => {
            if (d.product.picture) {
                d.product.picture = d.product.picture.includes(req.custom.config.media_url) ? d.product.picture : (req.custom.config.media_url + d.product.picture);
            }
            return d;
        });

        return res.out(out);
    });
}

module.exports.getEmployeeByPhoneNumber = async (req, res) => {
    req.custom.where_property = "mobile";
    mainController.read(req, res, "member");
};

function isValidTime(timeStr) {
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:mm format regex
    return timeRegex.test(timeStr);
}

function isEndTimeAfterStartTime(startTimeStr, endTimeStr) {
    const startTimeInMinutes = timeToMinutes(startTimeStr);
    const endTimeInMinutes = timeToMinutes(endTimeStr);
    return endTimeInMinutes > startTimeInMinutes;
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function calculateLoginTimeRange(workingTimes) {
    const currentTime = new Date();
    const fromTimeParts = workingTimes.from.split(':');
    const toTimeParts = workingTimes.to.split(':');

    const fromHour = parseInt(fromTimeParts[0], 10);
    const fromMinute = parseInt(fromTimeParts[1], 10);
    const toHour = parseInt(toTimeParts[0], 10);
    const toMinute = parseInt(toTimeParts[1], 10);

    const startLoginTime = new Date(currentTime);
    startLoginTime.setHours(fromHour, fromMinute, 0, 0);

    const endLoginTime = new Date(currentTime);
    endLoginTime.setHours(toHour, toMinute, 0, 0);

    return {
        start: startLoginTime,
        end: endLoginTime,
    };
}

