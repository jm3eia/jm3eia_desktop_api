const enums = require("../../libraries/enums");
const ObjectID = require('mongodb').ObjectID;

module.exports.deleteAllEmployeeLogs = async (req, res) => {
    if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
    try {
        const el = await req.custom.db.client().dropCollection('employee_logs');
        const opa = await req.custom.db.client().dropCollection('order_products_actions');
        console.log(`Collection 'employee_logs' dropped:`, el);
        console.log(`Collection 'order_products_actions' dropped:`, opa);
        return res.out({
            el,
            opa
        })
    } catch (err) {
        console.error('ERR: ', err);
        return res.out(err.message);
    }
}


module.exports.getAdminById = async (req, res) => {
    /* const collection = req.custom.db.client().collection('setting');
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    await collection.insertOne({ key: "jm3eia_pro", value: { allow: true, shipping_cost: 10, only_jm3eia: false, content: [] } }); */

    return res.out('SUCCESS');
    /* const admin = await collection.updateOne({ email: "atef@jm3eia.com" }, {
        $set: {
            permissions: [
                "product",
                "category",
                "option",
                "feature",
                "supplier",
                "inventory",
                "review",
                "country",
                "city",
                "store",
                "coupon",
                "report",
                "order",
                "order/by_product",
                "order/by_user",
                "order_without_quantities",
                "issue",
                "employee",
                "page",
                "slide",
                "notification",
                "member_notification",
                "faq"
            ]
        }
    });

    return res.out(admin);
 */
}


module.exports.changeStatus = async (req, res) => {
    const collection = req.custom.db.client().collection('order');

    const today = new Date();

    const update = await collection.updateMany({ status: 11, delivery_time: { $gte: today } }, { $set: { status: 2 } });

    return res.out({ update, today });

}