const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "city_id": {
        "type": ObjectID,
        "collection": "city",
        "required": true
    },
    "widget": {
        "required": true
    },
    "street": {
        "required": true
    },
    "gada": {
        "required": false
    },
    "house": {
        "required": false
    }
};