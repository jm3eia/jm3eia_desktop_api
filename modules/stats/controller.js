// Stats Controller
const moment = require('moment');
const { status_message } = require("../../libraries/enums");

/**
 * List stats
 * @param {Object} req
 * @param {Object} res
 */
module.exports.list = async (req, res) => {
  try {
    if (req.custom.isAuthorized === false) {
      return res.out(req.custom.UnauthorizedObject, status_message.UNAUTHENTICATED);
    }

    const { date_from, date_to } = req.query;

    const fromDate = new Date(moment(date_from).add(parseInt(process.env.DATE_UTC), 'hours'));
    const toDate = new Date(moment(date_to).add(parseInt(process.env.DATE_UTC), 'hours'));

    const query = {
      delivery_time: { $gte: fromDate, $lt: toDate },
    };

    const collection = req.custom.db.client().collection('order');

    const ordersCount = await collection.countDocuments(query);


    const productsCount = await collection.aggregate([
      { $match: query },
      //{ $unwind: '$products' },
      //{ $group: { _id: '$products.sku' } },
      /* {
        $group: {
          _id: '$products.sku',
          count: { $sum: '$products.quantity' }
        }
      } */
      {
        $group: {
          //_id: '$data.products.sku',
          _id: null,
          //orderCount: { $sum: 1 },
          count: { $sum: { $size: '$products' } }
        }
      }
    ]).toArray();

    return res.out({ orders: ordersCount, products: productsCount.length > 0 ? productsCount[0].count : 0 });
  } catch (err) {
    console.error('Error retrieving statistics', err);
    return res.out({ error: 'Failed to retrieve statistics' });
  }
};


module.exports.pro_stats = async (req, res) => {
    try {
        const filter = {};
        if (req.query.date_from && req.query.date_to) {
            filter['start_date'] = {
                "$gte": new Date(req.query.date_from.toString()),
                "$lte": new Date(req.query.date_to.toString())
            };
        } else {
            if (req.query.date_from) {
                filter['start_date'] = { "$gte": new Date(req.query.date_from.toString()) };
            }
            if (req.query.date_to) {
                filter['start_date'] = { "$lte": new Date(req.query.date_to.toString()) };
            }
        }
        
        const member_collection = req.custom.db.client().collection('member');
        const pro_logs_collection = req.custom.db.client().collection('jm3eia_pro_logs');
        
        // Get both counts concurrently for better performance
        const [totalSubscriptionsByFilter, currentActiveSubscriptions] = await Promise.all([
            pro_logs_collection.countDocuments(filter),
            member_collection.countDocuments({ "pro.active": true })
        ]);
        
        // Return the response
        return res.out({
            filtered: totalSubscriptionsByFilter,
            active: currentActiveSubscriptions
        });
        
    } catch (error) {
        console.error('Error fetching pro stats:', error);
        return res.out({ error: error.message }, status_message.UNEXPECTED_ERROR);
    }
}


module.exports.points_stats = async (req, res) => {
  try {
    req.custom.clean_filter['type'] = "claimed_reward";

    if (req.query.date_from && req.query.date_to) {
      req.custom.clean_filter['created'] = {
        "$gte": new Date(req.query.date_from.toString()),
        "$lte": new Date(req.query.date_to.toString())
      };
    } else {
      if (req.query.date_from) {
        req.custom.clean_filter['created'] = { "$gte": new Date(req.query.date_from.toString()) };
      }
  
      if (req.query.date_to) {
        req.custom.clean_filter['created'] = { "$lte": new Date(req.query.date_to.toString()) };
      }
    }


    mainController.list(req, res, "point_history", undefined, async (out) => {
      if (out.data.length < 1) {
        return res.out(out);
      }

      const offerMembersIds = out.data.map(o => ObjectID(o.member_id.toString()));

      const member_collection = req.custom.db.client().collection('member');
      const reward_collection = req.custom.db.client().collection("reward");

      const members = await member_collection.find({ _id: { $in: offerMembersIds } }, { fullname: 1, mobile: 1 }).toArray();

      const rewardsIds = out.data.map(r => ObjectID(r.reward_id.toString()));
      const rewards = await reward_collection.find({ _id: { $in: rewardsIds } }, { title: 1 }).toArray();

      for (let point_history of out.data) {
        const member = members.find(m => m._id.toString() == point_history.member_id.toString());
        const reward = rewards.find(r => r._id.toString() == point_history.reward_id.toString());
        point_history.fullname = member.fullname;
        point_history.mobile = member.mobile;
        point_history.title = reward.title;
      }

      res.out(out);

    })
  } catch(error) {
    console.error('Error fetching pro stats:', error);
        return res.out({ error: error.message }, status_message.UNEXPECTED_ERROR);
  }
}