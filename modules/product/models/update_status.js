// Product model
module.exports = {
    "status": {
        "type": Boolean,
        "required": true
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
