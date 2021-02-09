const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "name": {
        "isLang": true,
        "required": true
    },
    "contents": {
        "isLang": true,
        "required": true
    },
    "description": {
        "isLang": true,
    },
    "keywords": {
        "isLang": true,
    },
    "brand_id": {
        "type": ObjectID,
        "collection": "brand"
    },
    "supplier_id": {
        "type": ObjectID,
        "collection": "supplier"
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
        "unique": true,
        "collection": 'product',
        "required": true
    },
    "old_price": {
        "type": Number
    },
    "price": {
        "type": Number,
        "required": true
    },
    "weight": {
        "type": Number,
        "default": 0.0
    },
    "unit_id": {
        "type": ObjectID,
        "collection": "unit"
    },
    "max_quantity_cart": {
        "type": Number
    },
    "picture": {
        "type": String
    },
    "gallery_pictures": {
        "type": Array
    },
    "prod_n_categoryArr": {
        "type": Array,
        "model":{
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
            }
        }
    },
    "prod_n_inventoryArr": {
        "type": Array,
        "model":{
            "inventory_id": {
                "type": ObjectID,
                "collection": "inventory",
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
    "variants": {
        "type": Array
    },
    "created": {
        "type": Date,
        "default": new Date(),
        "insertOnly": true,
        "auto": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
	"feature_id": {
		"type": ObjectID,
		"collection": "feature",
		"required": false,
		"isObject_key": true
	},
    "status": {
        "type": Boolean,
        "required": true
    }
};
