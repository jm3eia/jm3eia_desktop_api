const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "status": {
        "type": Number,
        "required": true
    },
    "order_number": {
        "type": String,
        "required": false
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
