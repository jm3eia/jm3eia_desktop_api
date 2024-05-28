//const ObjectID = require("mongodb").ObjectID;
module.exports = {
    "working_times": new Field({
        "type": Array,
        "model": {
            "week_day": new Field({
                "type": Number,
            }),
            "from": new Field({
                "type": String,
            }),
            "to": new Field({
                "type": String,
            }),
        }
    }),
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
