const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "barcode": {
        "type": String,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
