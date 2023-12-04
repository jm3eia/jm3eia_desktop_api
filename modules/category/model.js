const ObjectID = require("mongodb").ObjectID;

// Category model
module.exports = {
	"name": {
		"isLang": true,
		"required": true
	},
	"parent_id": {
		"type": ObjectID,
		"collection": "category"
	},
	"supplier_id": {
		"type": ObjectID,
		"collection": "supplier",
		"required": false,
	},
	"picture": {
		"type": String
	},
	"picture_lang": {
		"isLang": true,
		"required": false
	},
	"category_n_storeArr": {
		"type": Array,
		"model": {
			"store_id": {
				"type": ObjectID,
				"collection": "store",
				"required": true,
				"isObject_key": true
			},
			"sorting": {
				"type": Number,
				"required": true
			},
			"status": {
				"type": Boolean,
				"required": true
			},
		},
	},
	"category_n_billArr": {
		"type": Array,
		"model": {
			"store_id": {
				"type": ObjectID,
				"collection": "store",
				"required": true,
				"isObject_key": true
			},
			"sorting": {
				"type": Number,
				"required": true
			},
			"status": {
				"type": Boolean,
				"required": true
			},
		},
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
	"featured": {
		"type": Number,
	},
	"status": {
		"type": Boolean,
		"required": true
	},
};
