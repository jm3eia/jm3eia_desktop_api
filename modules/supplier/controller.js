const md5 = require("md5");
const sha1 = require("sha1");
const jwt = require('jsonwebtoken');
const ObjectID = require("mongodb").ObjectID;
const enums = require('../../libraries/enums');
const common = require("../../libraries/common");
const mainController = require("../../libraries/mainController");
const collectionName = "supplier";

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
        email: { $regex: new RegExp('^' + req.body.email + '$', 'i') },
        password: sha1(md5(req.body.password)),
    };
    collection.findOne(query).then(async (theuser) => {

        if (!theuser) {
            return res.out({
                error: local.failed_auth_user
            }, status_message.UNEXPECTED_ERROR);
        }

        var token = jwt.sign({
            userId: theuser._id,
            employee: false,
            supplier: true,
        }, config.secret, {
            expiresIn: 3600 * 24
        });
        delete theuser.password;
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
/* module.exports.logout = (req, res) => {
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
            }, enums.status_message.UNEXPECTED_ERROR);

        const collection = req.custom.db.client().collection(collectionName);

        if (req.body.employees && req.body.employees.length > 0 && !decoded.employee) {
            await collection.updateMany({ _id: { $in: req.body.employees.map(e => ObjectID(e)) } }, { $set: { token_status: 0 } });
            const employees = await collection.find({ _id: { $in: req.body.employees.map(e => ObjectID(e)) } }).toArray();
            for (let e of employees) {
                await common.saveLog(req, 'logout', 'employee', ObjectID(e._id.toString()), undefined, undefined, undefined, e.username);
            }
            return res.out({
                message: local.logout_done
            });
        }

        if (decoded.employee) {
            await collection.updateOne({ _id: ObjectID(decoded.userId.toString()) }, { $set: { token_status: 0 } });
            await common.saveLog(req, 'logout', 'employee', ObjectID(decoded.userId), undefined, undefined, undefined, decoded.username);
            return res.out({
                message: local.logout_done
            });
        } else {
            return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
        }


        //return res.out({ message: err.message }, enums.status_message.UNEXPECTED_ERROR);
    });

}; */

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

        if (!decoded.supplier) {
            return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHORIZED);
        }

        req.params.Id = decoded.userId;
        mainController.read(req, res, collectionName, (doc) => {
            delete doc.password;
            return res.out(doc);
        });
    });
};

module.exports.list = async (req, res) => {
    projection = {
        _id: 1,
        name: 1,
        email: 1,
        working_times: 1,
        picture: 1,
        logo: 1,
        cities: 1,
        available_delivery_times: 1,
        working_times: 1,
        is_busy: 1, 
        created: 1,
        status: 1,
    };
    mainController.list(req, res, collectionName, projection);
}


module.exports.update_busy = async (req, res) => {
    req.custom.model = require('./models/update_busy');
	mainController.update(req, res, collectionName);
}