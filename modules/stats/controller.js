// Stats Controller

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
      delivery_time: { $gte: fromDate, $lte: toDate },
    };

    console.log(process.env.DATE_UTC, query);

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

    console.log(productsCount);

    return res.out({ orders: ordersCount, products: productsCount[0]?.count || 0 });
  } catch (err) {
    console.error('Error retrieving statistics', err);
    return res.out({ error: 'Failed to retrieve statistics' });
  }
};