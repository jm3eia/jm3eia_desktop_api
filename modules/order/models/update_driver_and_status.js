const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    /* "status": {
        "type": Number,
        "default": 10
    }, */
    "driver_name": {
        "type": String,
        "required": true
    },
    "driver_mobile": {
        "type": String,
        "required": true
    },
    "driver_track_id": {
        "type": String,
        "required": false
    },
    "driver_id": {
        "type": String,
        "required": false
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
