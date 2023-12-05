// Category model
module.exports = {
	"name": {
		"isLang": true,
		"required": true
	},
	"sorting": {
		"type": Number,
		"required": false
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
	"status": {
		"type": Boolean,
		"required": true
	},
};
