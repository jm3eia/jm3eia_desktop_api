// Upload Controller

// Load required modules
const path = require('path');
//const status_message = require('../../enums/status_message');
//const config = require('../../config');

/**
 * Upload images
 * @param {Object} req
 * @param {Object} res
 */
module.exports.upload = function (req, res) {
    /* if (req.custom.isAuthorized === false) {
        return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
    } */
    /* let url = req.file.path.split('\\').join('/').replace(config.base_media_dir, '');
    const data = {
        path: url
    }; */
    res.out({});
};
