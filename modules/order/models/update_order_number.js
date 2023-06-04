const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "order_number": {
        "type": Number,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
