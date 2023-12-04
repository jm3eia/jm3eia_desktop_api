// Load required modules
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const crypto = require('crypto');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const config = require('../../libraries/config');

var multer = require('multer');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dateObj = new Date();
        const day = dateObj.getUTCDate();
        const month = dateObj.getUTCMonth() + 1;
        const year = dateObj.getUTCFullYear();
        const fullPath = `${config.base_media_dir}/${year}/${month}/${day}/`;
        fs.mkdirSync(fullPath, { recursive: true });
        cb(null, fullPath)
    },
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            cb(null, raw.toString('hex') + Date.now() + '.' + mime.extension(file.mimetype));
        });
    }
});
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {

        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(`${req.custom.local.unsupported_file_types} ${filetypes}`);
    }
});

/**
 * POST /upload
 */
router.post('/', upload.single('picture'), controller.upload);

module.exports = router;
