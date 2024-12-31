const ObjectID = require('mongodb').ObjectID;
const common = require("../../libraries/common");

module.exports.claim_wallet_offers = async (req, offers, user_info, order_id) => {
    if (offers.filter(o => o.type === 'wallet').length < 1) return;

    const wallet = parseFloat(user_info.wallet || 0);

    let total = 0;
    for (const offer of offers) {
        if (offer.type !== 'wallet' || !offer.wallet_amount) continue;
        const amount = parseFloat(offer.wallet_amount);
        total += amount;
    }

    const new_wallet = common.getFixedPrice(parseFloat(wallet) + total);
    const wallet_data = {
        "member_id": ObjectID(user_info._id.toString()),
        "old_wallet": common.getFixedPrice(wallet),
        "new_wallet": new_wallet,
        "type": "cart_offer",
        "notes": `Claim cart offer from ${common.getFixedPrice(wallet)} to ${new_wallet}`,
        "order_id": ObjectID(order_id.toString()),
        "created": new Date(),
    };
    const wallet_history_collection = req.custom.db.client().collection('wallet_history');
    await wallet_history_collection.insertOne(wallet_data);

    const member_collection = req.custom.db.client().collection('member');
    await member_collection.updateOne({
        _id: ObjectID(user_info._id.toString())
    }, {
        $set: { wallet: new_wallet }
    }).catch((e) => console.error(req.originalUrl, e))

}