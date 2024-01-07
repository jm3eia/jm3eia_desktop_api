const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "store_id": {
        "type": ObjectID,
        "collection": "store",
        "required": true
    },
    "price": {
        "type": Number,
        "required": true
    },
    "status": {
        "type": Boolean,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};