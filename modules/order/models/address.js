// Brand model
const ObjectID = require("mongodb").ObjectID;
const common = require('../../../libraries/common');

module.exports = {
	/* "city_name": new Field({
		"required": true,
	}), */
	"city_id": {
		"type": ObjectID,
		"collection": "city",
		"requred": true,
	},
	"widget": {
		"default": "",
		"required": false,
	},
	"street": {
		"default": "",
		"required": false,
	},
	"gada": {
		"default": "",
		"required": false
	},
	"house": {
		"default": "",
		"required": false,
	},
	"floor": {
		"default": "",
		"required": false
	},
	"latitude": {
		"required": false
	},
	"longitude": {
		"required": false
	},
	"address_note": {
		"type": String,
		"required": false
	},
	"way_of_delivery": {
		"required": false,
		"in_array": ["direct_to_client", "leave_at_door"]
	},
	"modified": {
		"type": Date,
		"default": common.getDate(),
		"updateOnly": true,
		"auto": true
	}
};