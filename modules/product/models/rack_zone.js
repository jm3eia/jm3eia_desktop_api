// Product model
module.exports = {
    "rack_zone": {
        "type": String,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
