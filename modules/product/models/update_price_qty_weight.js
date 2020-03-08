const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "price": {
        "type": Number,
        "required": true
    },
    "weight": {
        "type": Number,
        "default": 0.0
    },
    "prod_n_storeArr": {
        "required": true,
        "type": Array,
        "model":{
            "store_id": {
                "type": ObjectID,
                "collection": "store",
                "required": true,
                "isObject_key": true
            },
            "quantity": {
                "type": Number,
                "required": true
            },
            "status": {
                "type": Boolean,
                "required": true
            }
        }
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
