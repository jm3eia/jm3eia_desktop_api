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
        const member_collection = req.custom.db.client().collection('member');

        const commonDate = getDate();

        const batchSize = 1000;

        const expiredTransactionsCursor = point_transactions_collection
            .find({ member_id: ObjectID("60f14267aeb2641b931a0076"), trashed: false, expiresAt: { $lt: commonDate } })
            .batchSize(batchSize);

        let batch;
        while ((batch = await expiredTransactionsCursor.nextBatch()) && batch.length > 0) {
            const transactionsGroupedByMember = {};

            batch.forEach(transaction => {
                const memberId = transaction.member_id.toString();
                if (!transactionsGroupedByMember[memberId]) {
                    transactionsGroupedByMember[memberId] = { member_id: transaction.member_id, transactions: [] };
                }
                transactionsGroupedByMember[memberId].transactions.push(transaction);
            });

            const allTransactionsIds = Object.keys(transactionsGroupedByMember).map(ObjectID);

            console.log('ALL TRANSACTIONS IDS: ', allTransactionsIds);
            
            const members = await member_collection.find({ _id: { $in: allTransactionsIds } }).toArray();

            return res.out({allTransactionsIds, members});

            const bulkWrites = [];

            members.forEach(m => {
                const memberId = m._id.toString();
                const foundTransaction = transactionsGroupedByMember[memberId];

                let pointsToRemove = 0;
                let convertedPoints = parseInt(m.convertedPoints) || 0;

                if (foundTransaction) {
                    foundTransaction.transactions.forEach(t => {
                        const transactionPoints = parseInt(t.points);

                        if (convertedPoints >= transactionPoints) {
                            bulkWrites.push({
                                updateOne: {
                                    filter: { _id: ObjectID(t._id.toString()) },
                                    update: { $set: { used: true, trashed: true } }
                                }
                            });
                            convertedPoints -= transactionPoints;
                        } else {
                            bulkWrites.push({
                                updateOne: {
                                    filter: { _id: ObjectID(t._id.toString()) },
                                    update: { $set: { trashed: true } }
                                }
                            });
                            const sub = transactionPoints - convertedPoints;
                            convertedPoints = 0;
                            pointsToRemove += sub;
                        }
                    });
                }

                let memberPoints = parseInt(m.points) || 0;

                if (pointsToRemove > 0 && memberPoints > 0) {
                    memberPoints -= pointsToRemove;
                    bulkWrites.push({
                        updateOne: {
                            filter: { _id: ObjectID(memberId) },
                            update: { $set: { points: memberPoints, convertedPoints } }
                        }
                    });
                }
            });

            if (bulkWrites.length > 0) {
                await point_transactions_collection.bulkWrite(bulkWrites);
            }
        }

        return res.out('Done!');
    } catch (err) {
        console.error(req.originalUrl, err);
    }
};
