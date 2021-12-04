const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
	"member_id": {
		"type": ObjectID,
		"collection": "member",
		"required": true,
		"isObject_key": true
	},
	"points": {
		"type": Number,
		"required": true
	},
	"notes": {
		"required": true
	},
};
