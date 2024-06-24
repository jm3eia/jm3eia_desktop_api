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




const update_children_quantities = async function (req, product) {
    try {
        if (product.base_product && product.base_product.sku) return;
        const collection = req.custom.db.client().collection("product");
        const children = await collection.find({ base_product: { $exists: true }, "base_product.sku": product.sku }).toArray();
        const promises = [];
        for (let p of children) {
            let total_quantity = 0;
            const data = {
                prod_n_storeArr: product.prod_n_storeArr.map(s => {
                    const qty = Math.floor(s.quantity / p.base_product.item_quantity);
                    total_quantity += qty;
                    return { ...s, quantity: qty }
                }) 
            };

            console.error('PRODUCT: ', total_quantity);

            //console.log('UPDATE QUANTITIES DATAT: ', p.sku, data.prod_n_storeArr[0], product.prod_n_storeArr[0], p.base_product.item_quantity);
            
            if (p.variants && product.variants) {
                data.variants = p.variants.map(v => {
                    const index = product.variants.findIndex(variant => variant.sku.split('-')[1] == v.sku.split('-')[1]);
                    if (v.prod_n_storeArr && index > -1) {
                        v.prod_n_storeArr = product.variants[index].prod_n_storeArr.map(s => ({ ...s, quantity: Math.floor(s.quantity / p.base_product.item_quantity) }));
                        
                    }
                    return v;
                });
            }

            if (total_quantity > 0) {
                data.status = true;
            } else {
                data.status = false;
            }

            promises.push(collection.updateOne({ _id: ObjectID(p._id) }, { $set: data }));
            
        }

        if (promises.length > 0) {
            Promise.all(promises);
        }
    } catch (error) {
        console.error(req.originalUrl, error);
    }
}


/**
 * Types: "update", "increase", "decrease"
 */
module.exports.update_base_product = async function (req, product, store_id, type = "update", quantity) {
    if (
      !product.base_product ||
      !product.base_product.sku ||
      !product.base_product.item_quantity
    ) {
        update_children_quantities(req, product);
        return;
    }

    if (type !== 'update' && !quantity) {
        console.error('You should set the quantity.');
        return;
    }
  
    const collection = req.custom.db.client().collection("product");
  
    const base_product = await collection.findOne(
      { sku: product.base_product.sku },
      { projection: { _id: 1, prod_n_storeArr: 1, sku: 1 } }
    );

    const product_store = product.prod_n_storeArr.find(s => s.store_id.toString() === store_id);

    let total_quantity = 0;
    const data = {
        prod_n_storeArr: base_product.prod_n_storeArr.map(s => {
            if (s.store_id.toString() === store_id) {
                if (type === 'update') {
                    const qty = Math.floor(product_store.quantity * product.base_product.item_quantity);
                    s.quantity = qty;
                    total_quantity += s.quantity;
                }

                if (type === 'increase') {
                    const qty = Math.floor(quantity * product.base_product.item_quantity);
                    s.quantity = s.quantity + qty;
                    total_quantity += s.quantity;
                }

                if (type === 'decrease') {
                    const qty = Math.floor(quantity * product.base_product.item_quantity);
                    s.quantity = s.quantity - qty;
                    if (s.quantity < 0) s.quantity = 0;
                    total_quantity -= s.quantity;
                }

            }

            return s;
        })
    };

    if (product.variants && base_product.variants) {
        data.variants = product.variants.map(v => {
            const index = base_product.variants.findIndex(variant => variant.sku.split('-')[1] == v.sku.split('-')[1]);
            if (v.prod_n_storeArr && index > -1) {
                const variant_store = v.prod_n_storeArr.find(s => s.store_id.toString() === store_id);
                if (variant_store) {
                    v.prod_n_storeArr = base_product.variants[index].prod_n_storeArr.map(s => {
                        if (s.store_id.toString() === store_id) {
                            if (type === 'update') {
                                const qty = Math.floor(variant_store.quantity * product.base_product.item_quantity);
                                s.quantity = qty;
                            }
    
                            if (type === 'increase') {
                                const qty = Math.floor(quantity * product.base_product.item_quantity);
                                s.quantity = s.quantity + qty;
                            }
    
                            if (type === 'decrease') {
                                const qty = Math.floor(quantity * product.base_product.item_quantity);
                                s.quantity = s.quantity - qty;
                                if (s.quantity < 0) s.quantity = 0;
                            }
                        }
                        return s;
                    });
                }
                
            }
            return v;
        });
    }

    
    if (total_quantity > 0) {
        data.status = true;
    } else {
        data.status = false;
    }

    const result = await collection
      .findOneAndUpdate(
        {
          _id: ObjectID(base_product._id.toString()),
        },
        {
          $set: data,
        },
        { returnDocument: 'after' }
      )
      .catch(() => null);

      if (result.ok === 1) {
        update_children_quantities(req, result.value);
      } else {
        update_children_quantities(req, product);
      }
  };


  module.exports.get_prod_status_by_quantity = (prod_n_storeArr) => {
    if (!prod_n_storeArr || prod_n_storeArr.length < 1) {
        return false;
    }

    const total_quantities = prod_n_storeArr.reduce((accumulator, currentValue) => {
		// If quantity is undefined or null, treat it as 0
		const quantity = currentValue.quantity || 0;
		return accumulator + quantity;
	  }, 0);

    return total_quantities > 0;
  }