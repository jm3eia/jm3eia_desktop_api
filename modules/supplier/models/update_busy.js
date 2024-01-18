//const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "is_busy": {
        "type": Boolean,
        "required": true,
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
