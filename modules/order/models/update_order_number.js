const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "order_number": {
        "type": String,
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
