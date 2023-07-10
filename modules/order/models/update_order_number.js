const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "order_number": {
        "type": Number,
        "required": true,
        "unique": true,
        "collection": "order"
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
