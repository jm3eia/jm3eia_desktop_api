const md5 = require("md5");
const sha1 = require("sha1");
const jwt = require('jsonwebtoken');
const ObjectID = require("mongodb").ObjectID;
const enums = require('../../libraries/enums');
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
    const cpllection = req.custom.db.client().collection(collectionName);
    const config = req.custom.config;
    const local = req.custom.local;
    const query = {
        username: req.body.username,
        password: sha1(md5(req.body.password)),
    };
    cpllection.findOne(query).then((theuser) => {

        if (!theuser) {
            return res.out({
                error: local.failed_auth_user
            }, status_message.UNEXPECTED_ERROR);
        }

        var token = jwt.sign({
            userId: theuser._id,
            employee: true,
            country_id: ObjectID(theuser.country_id)
        }, config.secret, {
            expiresIn: 3600 // expires in 1 hour
        });
        delete theuser.password;
        theuser.hash_username = md5(theuser.username);
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
        }, status_message.UNAUTHENTICATED);

    jwt.verify(token, config.secret, function (err, decoded) {
        if (err)
            return res.out({
                auth: false,
                message: local.failed_auth
            }, status_message.UNEXPECTED_ERROR);

        if (!decoded.employee) {
            return res.out({ auth: false, message: local.failed_auth }, enums.status_message.UNAUTHENTICATED);
        }

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