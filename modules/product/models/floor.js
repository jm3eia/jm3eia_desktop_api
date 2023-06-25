// Product model
module.exports = {
    "floor": {
        "type": Number,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
