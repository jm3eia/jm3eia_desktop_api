const ObjectID = require("mongodb").ObjectID;

// Employee model
module.exports = {
    "name": {
        "required": true
    },
    "username": {
        "required": true,
        "unique": true,
        "collection": 'employee'
    },
    "mobile": {
        "required": true,
        /* "length": 8,
        "unique": true,
        "collection": 'employee' */
    },
    "password": {
        "required": true,
    },
    "department": {
        "type": Number,
        "required": true
    },
    "store_id": {
        "type": ObjectID,
        "collection": "store",
        "required": true
    },
    "working_times": new Field({
        "type": Object,
        "model": {
            "from": new Field({
                "type": String,
            }),
            "to": new Field({
                "type": String,
            }),
        }
    }),
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
