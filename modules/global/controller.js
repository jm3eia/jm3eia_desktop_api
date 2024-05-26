const { getDate } = require("../../libraries/common");
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
    today.setHours(0, 0, 0, 0);

    const update = await collection.updateMany({ status: 11, created: { $gte: today } }, { $set: { status: 2 } });

    return res.out({ update, today });

}

module.exports.pointsToTransaction = async (req, res) => {
    try {
        const point_transactions_collection = req.custom.db.client().collection('point_transactions');
        const expiredTransactions = await point_transactions_collection.find({ trashed: false, expiresAt: { $lt: getDate() } }).toArray() || [];

        const transactionsGroupedByMember = [];
        for (let transaction of expiredTransactions) {
            const foundTransactionIndex = transactionsGroupedByMember.findIndex(t => t.member_id.toString() == transaction.member_id.toString());
            if (foundTransactionIndex > -1) {
                transactionsGroupedByMember[foundTransactionIndex].transactions.push(transaction);
            } else {
                transactionsGroupedByMember.push({ member_id: transaction.member_id, transactions: [transaction] });
            }
        }

        const allTransactionsIds = transactionsGroupedByMember.map(t => ObjectID(t.member_id.toString()));

        
        const member_collection = req.custom.db.client().collection('member');
        const members = await member_collection.find({ _id: { $in: allTransactionsIds } }).toArray();
        return res.out({ allTransactionsIds: allTransactionsIds.length, members: members.length });

        const promises = [];
        for (let m of members) {
            const foundTransactionIndex = transactionsGroupedByMember.findIndex(t => m._id.toString() == t.member_id.toString());
            let pointsToRmove = 0;
            let convertedPoints = parseInt(m.convertedPoints) || 0;
            if (foundTransactionIndex > -1) {
                for (let t of transactionsGroupedByMember[foundTransactionIndex].transactions) {
                    const transactionPoints = parseInt(t.points);
                    if (convertedPoints >= transactionPoints) {
                        promises.push(point_transactions_collection.updateOne({ _id: ObjectID(t._id.toString()) }, { $set: { used: true, trashed: true } }));
                        convertedPoints -= transactionPoints;
                    } else if (convertedPoints < transactionPoints) {
                        promises.push(point_transactions_collection.updateOne({ _id: ObjectID(t._id.toString()) }, { $set: { trashed: true } }));
                        const sub = transactionPoints - convertedPoints;
                        convertedPoints = 0;
                        pointsToRmove += sub;
                    } else {
                        pointsToRmove += transactionPoints;
                    }
                }
            }

            let memberPoints = m.points ? parseInt(m.points) : 0;

            if (pointsToRmove > 0 && memberPoints > 0) {
                memberPoints -= pointsToRmove;
                promises.push(member_collection.updateOne({ _id: ObjectID(m._id.toString()) }, { $set: { points: memberPoints, convertedPoints } }));
            }

        }

        await Promise.all(promises);

        return res.out('Done! ', expiredTransactions.length);

    } catch (err) {
        console.error(req.originalUrl, err);
    }
};



module.exports.fix_parent_products = async (req, res) => {
    /* if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
	} */

	const collection = req.custom.db.client().collection("product");

    const response = await collection.updateMany({ 'base_product.sku': { $exists: true }, 'prod_n_storeArr.quantity': { $gt: 0 }, status: false }, { $set: { status: true } });

	
	return res.out({ response });
}

module.exports.fix_variants = async (req, res) => {
    try {
        const collection = req.custom.db.client().collection('product');
        const products = await collection.find({
            variants: { $exists: true, $type: 'array', $ne: [] },
            $expr: {
                $gt: [
                    { $size: {
                        $filter: {
                            input: "$variants",
                            as: "variant",
                            cond: { $not: { $startsWith: ["$$variant.sku", "$$sku"] } }
                        }
                    } 
                },
                0]
            }
        }).toArray();

      return res.out({ length: products.length, products: products.map(p => ({ sku: p.sku, variants: p.variants.map(v => v.sku) })) });

      console.log('Products fetched ', products.count);

      const promises = [];


      for (const product of products) {
        const mainSku = product.sku;
        
        const newVariants = product.variants.map(v => {
            const splittedSku = v.sku.split('-');
            if (splittedSku[0] !== mainSku) {
                v.sku = `${mainSku}-${splittedSku[1]}`;
            }
            return v;
        });

        promises.push(collection.updateOne(
            { _id: product._id },
            { $set: { variants: newVariants } }
        ));
        
      }

      await Promise.all(promises);

      return res.out({ products: products.length, skus: products.map(p => p.sku) });
    } catch (err) {
        console.error('ERR: ', err);
        return res.out(err);
    }

}