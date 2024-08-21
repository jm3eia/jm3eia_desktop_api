/* module.exports.update_status = async (req, res) => {
  try {
    if (req.custom.isAuthorized === false) {
		return res.out(req.custom.UnauthorizedObject, enums.status_message.UNAUTHENTICATED);
	}
	if (req.params.Id && !ObjectID.isValid(req.params.Id)) {
		return res.out({
			'message': req.custom.local.id_not_valid
		}, enums.status_message.INVALID_URL_PARAMETER);
	}

    const local = req.custom.local;

    const collectionName = "order";
    const collection = req.custom.db.client().collection(collectionName);

    const order = await collection.findOne({ _id: ObjectID(req.params.Id) });

    if (!order) {
      return res.out(
        {
          message: local.item_not_exists,
        },
        enums.status_message.NOT_FOUND
      );
    }

    if (order.status === parseInt(req.body.status)) {
      return res.out(
        { message: req.custom.local.order_being_processed },
        enums.status_message.VALIDATION_ERROR
      );
    }

    if (
      order.order_number &&
      parseInt(req.body.status) === 14 &&
      !req.body.order_number
    )
      req.body.order_number = order.order_number;

    if (order.order_number && parseInt(req.body.status) !== 14)
      req.body.order_number = order.order_number;

    req.custom.model = require("./models/update_status");

    const {
		data,
		unset,
		error
	} = await req.custom.getValidData(req);
	if (error) {
		return res.out(error, enums.status_message.VALIDATION_ERROR);
	}
	
	data.lastUser_update = ObjectID(req.custom.authUser.userId);
	req.custom.cache.unset(collectionName).catch(() => { });

    if (req.body.employee_username) {
        if (req.body.employee_department === 1) data.employee_username = req.body.employee_username;
        if (req.body.employee_department === 2) data.driver_username = req.body.employee_username;
        if (req.body.employee_department === 3) data.store_manager_username = req.body.employee_username;
    }

	await collection.updateOne({ _id: ObjectID(req.params.Id) }, { $set: data });

    if (parseInt(req.body.status) !== 4) {
      update_status_webhook(req.params.Id, req.body.status);
    }

    return res.out({
        message: local.saved_done
    }, enums.status_message.UPDATED);
  } catch (err) {
    console.error("UPDATE STATUS ERROR: ", err);
    return res.out({ message: err.message }, enums.status_message.UNEXPECTED_ERROR);
  }
}; */
