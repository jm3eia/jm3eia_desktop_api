const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "quantity": {
        "type": Number,
        "required": true
    },
    "store_id": {
        "type": ObjectID,
        "collection": "store",
        "required": true,
        "isObject_key": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
     "status": {
        "type": Boolean,
        "required": false
    }
};
