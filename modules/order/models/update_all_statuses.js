const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "orders": {
        "type": Array,
        "model": {
            "id": {
                "type": ObjectID,
                "required": true,
                "collection": "order",
            },
            "status": {
                "type": Number,
                "required": true
            },
            "order_number": {
                "type": String,
                "required": false
            },
            "driver_username": {
                "type": String,
                "required": false
            },
            "employee_username": {
                "type": String,
                "required": false
            }
        }
    },
    "modified": {
        "type": Date,
        "default": new Date(),
        "updateOnly": true,
        "auto": true
    },
};
