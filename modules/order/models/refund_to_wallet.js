const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "products": {
        "type": Array,
        "model": {
            "sku": {
                "type": String,
            },
            "quantity": {
                "type": Number,
            },
        }
    },
    "include_shipping_cost": {
        "type": Boolean,
        "default": false,
    },
    /* "mobile": {
        "type": String,
        "required": false,
    }, */
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
