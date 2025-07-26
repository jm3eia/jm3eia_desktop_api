const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "quantity": {
        "type": Number,
        "required": true
    },
    "barcode": {
        "type": Array,
        "required": true
    },
    "supplier_id": {
        "type": ObjectID,
        "collection": "supplier",
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
