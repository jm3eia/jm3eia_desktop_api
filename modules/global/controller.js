const enums = require("../../libraries/enums");
const ObjectID = require('mongodb').ObjectID;

module.exports.deleteAllEmployeeLogs = async (req, res) => {
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
    const collection = req.custom.db.client().collection('adminmember');
    const admin = await collection.findOne({ email: "atef@jm3eia.com" });

    return res.out(admin);

}