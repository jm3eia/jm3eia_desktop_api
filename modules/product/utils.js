const enums = require("../../libraries/enums");
const ObjectID = require("mongodb").ObjectID;

/**
 * 
 * order_id
 * total_quantity
 * quantity_remain
 * employee_username
 * store_manager
 * action
 */



/* module.exports.skipProduct = async (req, res, product) => {
    const collection = req.custom.db.client().collection('order_products_actions');
    req.custom.model = require('./models/skip_product');
    const {
        data,
        error
    } = await req.custom.getValidData(req);
    if (error) {
        return res.out(error, enums.status_message.VALIDATION_ERROR);
    }

    data.action = 'skip';
    data.product = product;

    await collection.insertOne(data);
} */

module.exports.unskipProduct = async (req, action) => {
    if (req.custom.authUser.department !== 3) return;
    const collection = req.custom.db.client().collection('order_products_actions');
    const orderId = req.params.Id || req.query.order_id;

    await collection.updateMany({ order_id: ObjectID(orderId), 'product.soft_code': req.params.soft_code }, {
        $set: {
            action,
            store_manager: req.custom.authUser.username,
            modified: new Date()
        }
    });
}