const ObjectID = require("mongodb").ObjectID;
const axios = require("axios");
const common = require("../../libraries/common");
const config = require("../../libraries/config");

module.exports.claim_wallet_offers = async (
  req,
  offers,
  user_info,
  order_id
) => {
  if (offers.filter((o) => o.type === "wallet").length < 1) return;

  const wallet = parseFloat(user_info.wallet || 0);

  let total = 0;
  for (const offer of offers) {
    if (offer.type !== "wallet" || !offer.wallet_amount) continue;
    const amount = parseFloat(offer.wallet_amount);
    total += amount;
  }

  const new_wallet = common.getFixedPrice(parseFloat(wallet) + total);
  const wallet_data = {
    member_id: ObjectID(user_info._id.toString()),
    old_wallet: common.getFixedPrice(wallet),
    new_wallet: new_wallet,
    type: "cart_offer",
    notes: `Claim cart offer from ${common.getFixedPrice(
      wallet
    )} to ${new_wallet}`,
    order_id: ObjectID(order_id.toString()),
    created: new Date(),
  };
  const wallet_history_collection = req.custom.db
    .client()
    .collection("wallet_history");
  await wallet_history_collection.insertOne(wallet_data);

  const member_collection = req.custom.db.client().collection("member");
  await member_collection
    .updateOne(
      {
        _id: ObjectID(user_info._id.toString()),
      },
      {
        $set: { wallet: new_wallet },
      }
    )
    .catch((e) => console.error(req.originalUrl, e));
};

module.exports.cashback_whatsapp_message = async (
  recipitent_phone,
  amount,
  lang = "ar",
  fallback_message = ""
) => {
  const url = "https://gw.cmtelecom.com/v1.0/message";

  const payload = {
    messages: {
      authentication: {
        productToken: config.cm.product_token,
      },
      msg: [
        {
          from: config.cm.sender_id,
          to: [
            {
              number: `00965${recipitent_phone}`,
            },
          ],
          body: {
            type: "auto",
            content: fallback_message,
          },
          allowedChannels: ["WhatsApp"],
          richContent: {
            conversation: [
              {
                template: {
                  whatsapp: {
                    namespace: "308b56a0_20b1_4bfa_a3d9_d35c23380d2b",
                    element_name: "50__cash_back_on_your_wallet",
                    language: {
                      policy: "deterministic",
                      code: lang,
                    },
                    components: [
                      {
                        type: "body",
                        parameters: [
                          {
                            type: "text",
                            text: amount,
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Message sent successfully:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error sending message:", error.response.data);
    } else {
      console.error("Axios error:", error.message);
    }
  }

  /* try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Message sent successfully:", data);
    } else {
      console.error("Error sending message:", data);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  } */
};

module.exports.product_unavailable_whatsapp_message = async (
  recipitent_phone,
  products_msg,
  fallback_message = "You have missing items"
) => {
  const url = "https://gw.cmtelecom.com/v1.0/message";

  const payload = {
    messages: {
      authentication: {
        productToken: config.cm.product_token,
      },
      msg: [
        {
          from: config.cm.sender_id,
          to: [
            {
              number: `00965${recipitent_phone}`,
            },
          ],
          body: {
            type: "auto",
            content: fallback_message,
          },
          allowedChannels: ["WhatsApp"],
          richContent: {
            conversation: [
              {
                template: {
                  whatsapp: {
                    namespace: "308b56a0_20b1_4bfa_a3d9_d35c23380d2b",
                    element_name: "test_missing_items_from_the_order",
                    language: {
                      policy: "deterministic",
                      code: "ar",
                    },
                    components: [
                      {
                        type: "body",
                        parameters: [
                          {
                            type: "text",
                            text: products_msg,
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Message sent successfully:", response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error sending message:", error.response.data);
    } else {
      console.error("Axios error:", error.message);
    }
  }
};

module.exports.emmit_change_status = async (
  order_id,
  user_id,
  status,
  points = 0,
  wallet = 0
) => {
  try {
    const host = "https://api.webengage.com";
    const licenseCode = config.webengage.license_code;
    const apiKey = config.webengage.api_key;

    const eventData = {
      "order Id": order_id,
      user_id: user_id,
      Status: status,
    };

    if (status === 4) {
      eventData["Points"] = points;
      eventData["Wallet"] = wallet;
    }

    const response = await axios.post(
      `${host}/v1/accounts/${licenseCode}/events`,
      {
        userId: user_id,
        eventName: "Order Status Changed",
        eventTime: getEventTime(common.getDate()),
        eventData: eventData,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Event sent successfully:", response.data);
  } catch (error) {
    console.error(
      "Error sending event:",
      error.response ? error.response.data : error.message
    );
  }
};

function getEventTime(date = new Date()) {
  const pad = (n) => (n < 10 ? "0" + n : n);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());

  const offset = -date.getTimezoneOffset();
  const offsetSign = offset >= 0 ? "+" : "-";
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${year}-${month}-${day}T${hour}:${min}:${sec}${offsetSign}${offsetHours}${offsetMinutes}`;
}

module.exports.reward_referrer_on_first_delivered_order = async (req, order) => {
  try {
    if (!order || !order._id || !order.user_data || !order.user_data._id) {
      return { applied: false, reason: "invalid_order" };
    }

    const referred_id = ObjectID(order.user_data._id.toString());
    const order_collection = req.custom.db.client().collection("order");
    const referral_collection = req.custom.db.client().collection("referral");
    const member_collection = req.custom.db.client().collection("member");
    const wallet_history_collection = req.custom.db.client().collection("wallet_history");

    const previous_delivered_orders = await order_collection.countDocuments({
      "user_data._id": referred_id,
      status: 4,
      _id: { $ne: ObjectID(order._id.toString()) },
    });
    if (previous_delivered_orders > 0) {
      return { applied: false, reason: "not_first_delivered_order" };
    }

    const referral_claim = await referral_collection.findOneAndUpdate(
      {
        referred_id: referred_id,
        referrer_rewarded: false,
      },
      {
        $set: {
          referrer_rewarded: true,
          first_delivered_order_id: ObjectID(order._id.toString()),
          modified: new Date(),
        },
      },
      { returnDocument: "before" }
    );

    if (!referral_claim || !referral_claim.value) {
      return { applied: false, reason: "no_pending_referral" };
    }

    const referral = referral_claim.value;
    const referrer_id = ObjectID(referral.referrer_id.toString());
    const reward_amount = parseFloat(referral.referrer_reward_amount || 3);

    const existing_reward = await wallet_history_collection.findOne(
      {
        type: "referral_referrer_reward",
        referral_id: ObjectID(referral._id.toString()),
      },
      { projection: { _id: 1 } }
    );
    if (existing_reward) {
      return { applied: false, reason: "already_rewarded" };
    }

    const referrer = await member_collection.findOne(
      { _id: referrer_id },
      { projection: { _id: 1, wallet: 1 } }
    );
    if (!referrer) {
      await referral_collection.updateOne(
        { _id: ObjectID(referral._id.toString()) },
        {
          $set: {
            referrer_rewarded: false,
            first_delivered_order_id: null,
            modified: new Date(),
          },
        }
      );
      return { applied: false, reason: "referrer_not_found" };
    }

    const old_wallet = common.getFixedPrice(referrer.wallet || 0);
    const new_wallet = common.getFixedPrice(parseFloat(old_wallet) + reward_amount);

    await wallet_history_collection.insertOne({
      member_id: referrer_id,
      referral_id: ObjectID(referral._id.toString()),
      referred_id: referred_id,
      order_id: ObjectID(order._id.toString()),
      old_wallet,
      new_wallet,
      type: "referral_referrer_reward",
      notes: `Referral reward after first delivered order ${order._id.toString()}`,
      created: new Date(),
    });

    await member_collection.updateOne(
      { _id: referrer_id },
      { $set: { wallet: new_wallet } }
    );

    return { applied: true, referrer_id: referrer_id.toString() };
  } catch (e) {
    console.error("[reward_referrer_on_first_delivered_order]", e);
    return { applied: false, reason: "unexpected_error" };
  }
};
