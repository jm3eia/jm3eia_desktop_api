const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "quantity": {
        "type": Number,
        "required": true
    },
    "inventory_id": {
        "type": ObjectID,
        "collection": "inventory",
        "required": true,
        "isObject_key": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
