const ObjectID = require("mongodb").ObjectID;
// Product model
module.exports = {
    "order_id": {
        "type": ObjectID,
        "required": true
    },
    "total_quantity": {
        "type": Number,
        "required": true
    },
    "quantity_remain": {
        "type": Number,
        "required": true
    },
    "employee_username": {
        "type": String,
        "required": true
    },
    "order_number": {
        "type": Number,
        "required": true
    },
    "created": {
        "type": Date,
        "default_value": new Date(),
        "insertOnly": true,
        "auto": true
    },
};
