//const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "working_times": {
        "type": Array,
        "model": {
            "week_day": {
                "type": Number,
            },
            "from": {
                "type": String,
            },
            "to": {
                "type": String,
            },
        }
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
