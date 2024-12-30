const ObjectID = require("mongodb").ObjectID;

// Product model
module.exports = {
    "name": {
        "isLang": true,
        "required": true
    },
    "sku": {
        "type": String,
        "unique": true,
        "collection": 'product',
        "required": true
    },
    "soft_code": {
        "type": String,
        "unique": true,
        "collection": 'product',
        "required": true
    },
    "uom": {
        "type": String,
        "required": true
    },
    "barcode": {
        "type": String,
        "required": true
    },
    "floor": {
        "type": Number,
        "required": false
    },
    "picture": {
        "type": String
    },
    "pick_sorting": {
        "type": Number,
        "required": false
    },
    "price": {
        "type": Number,
        "required": true
    },
    "prod_n_categoryArr": {
        "type": Array,
        "model": {
            "category_id": {
                "type": ObjectID,
                "collection": "category",
                "required": true,
                "isObject_key": true
            },
            "rank_id": {
                "type": ObjectID,
                "collection": "renk",
                "required": false,
                "isObject_key": true
            },
            "sorting": {
                "type": Number,
                "required": true
            },
        }
    },
    "rack_zone": {
        "type": String,
        "required": false
    },
    "status": {
        "type": Boolean,
        "required": true
    },
    "modified": {
        "type": Date,
        "default_value": new Date(),
        "updateOnly": true,
        "auto": true
    }
};
