const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "sku": {
        "type": String,
        "required": true,
    },
    "quantity": {
        "type": Number,
        "required": true,
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
