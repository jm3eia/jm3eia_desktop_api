// Product model
module.exports = {
    "quantity": {
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
