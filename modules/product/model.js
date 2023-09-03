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
		"collection": "supplier",
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
		"unique": true,
		"collection": 'product',
		"required": true
	},
	"barcode_2": {
		"type": String,
		"unique": true,
		"collection": 'product',
		"required": false
	},
	"floor": {
		"type": Number,
		"required": true
	},
	"old_price": {
		"type": Number,
		"default_value": 0.0
	},
	"price": {
		"type": Number,
		"required": true
	},
	"discount_price_valid_until": {
		"required": false,
		"type": Date,
	},
	"vip_old_price": {
		"type": Number,
		"default_value": 0.0
	},
	"vip_price": {
		"type": Number,
		"required": false
	},
	"vip_discount_price_valid_until": {
		"required": false,
		"type": Date,
	},
	"show_discount_percentage": {
		"type": Boolean,
		"required": true,
		"default": false
	},
	"free_shipping": {
		"type": Boolean,
		"required": true,
		"default": false
	},
	"weight": {
		"type": Number,
		"default_value": 0.0
	},
	"unit_id": {
		"type": ObjectID,
		"collection": "unit"
	},
	"max_quantity_cart": {
		"type": Number
	},
	"preparation_time": {
		"type": Number,
		"default": 30,
	},
	"pick_sorting": {
		"type": Number,
		"required": false
	},
	"picture": {
		"type": String
	},
	"gallery_pictures": {
		"type": Array
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
	"prod_n_storeArr": {
		"type": Array,
		"model": {
			"store_id": {
				"type": ObjectID,
				"collection": "store",
				"required": true,
				"isObject_key": true
			},
			"feed_from_store_id": {
				"type": ObjectID,
				"collection": "store",
				"required": false,
				"isObject_key": true
			},
			"quantity": {
				"type": Number,
				"required": false
			},
			"status": {
				"type": Boolean,
				"required": true
			},
		},
	},
	"variants": {
		"type": Array,
		"model": {
			"barcode": {
				"type": String,
				"unique": true,
				"collection": 'product',
				"required": true
			},
			"old_price": {
				"type": Number,
				"default_value": 0.0
			},
			"price": {
				"type": Number,
				"required": true
			},
			"discount_price_valid_until": {
				"required": false,
				"type": Date,
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
			"options": {
				"type": Array
			},
			"gallery_pictures": {
				"type": Array
			},
			"prod_n_storeArr": {
				"type": Array,
				"model": {
					"store_id": {
						"type": ObjectID,
						"collection": "store",
						"required": true,
						"isObject_key": true
					},
					"feed_from_store_id": {
						"type": ObjectID,
						"collection": "store",
						"required": false,
						"isObject_key": true
					},
					"quantity": {
						"type": Number,
						"required": false
					},
					"status": {
						"type": Boolean,
						"required": true
					},
				},
			},
		}
	},
	"created": {
		"type": Date,
		"default_value": new Date(),
		"insertOnly": true,
		"auto": true
	},
	"modified": {
		"type": Date,
		"default_value": new Date(),
		"updateOnly": true,
		"auto": true
	},
	"features": {
		"type": Array,
		"model": {
			"feature_id": {
				"type": ObjectID,
				"collection": "feature"
			},
			"sorting": {
				"type": Number
			},
		}
	},
	"feature_id": {
		"type": ObjectID,
		"collection": "feature"
	},
	"feature_sorting": {
		"type": Number,
	},
	"is_gift": {
		"type": Boolean,
		"required": true,
		"default": false
	},
	"fast_shipping": {
		"type": Boolean,
		"required": true,
		"default": false
	},
	"fast_shipping_cost": {
		"type": Number,
		"required": false
	},
	"rack_zone": {
		"type": String,
		"required": true
	},
	"status": {
		"type": Boolean,
		"required": true
	},
};
