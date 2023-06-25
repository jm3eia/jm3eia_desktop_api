const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "barcode_2": {
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
