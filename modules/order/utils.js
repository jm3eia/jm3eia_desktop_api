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

/**
 * When the referred user's first order is delivered (status 4), credit both:
 * - referred user: referred_reward_amount (wallet type referral_referred_reward)
 * - referrer: referrer_reward_amount (wallet type referral_referrer_reward)
 */
module.exports.reward_referrer_on_first_delivered_order = async (req, order) => {
  try {
    if (!order || !order._id || !order.user_data || !order.user_data._id) {
      return { applied: false, reason: "invalid_order" };
    }

    const referred_id = ObjectID(order.user_data._id.toString());
    const order_id = ObjectID(order._id.toString());
    const order_collection = req.custom.db.client().collection("order");
    const referral_collection = req.custom.db.client().collection("referral");
    const member_collection = req.custom.db.client().collection("member");
    const wallet_history_collection = req.custom.db.client().collection("wallet_history");

    const previous_delivered_orders = await order_collection.countDocuments({
      "user_data._id": referred_id,
      status: 4,
      _id: { $ne: order_id },
    });
    if (previous_delivered_orders > 0) {
      return { applied: false, reason: "not_first_delivered_order" };
    }

    const referral = await referral_collection.findOne({ referred_id });
    if (!referral) {
      return { applied: false, reason: "no_pending_referral" };
    }

    const referral_oid = ObjectID(referral._id.toString());
    let referred_credited = false;
    let referrer_credited = false;

    // --- Referred user reward ---
    if (!referral.referred_rewarded) {
      const dup_referred = await wallet_history_collection.findOne(
        {
          type: "referral_referred_reward",
          referral_id: referral_oid,
        },
        { projection: { _id: 1 } }
      );
      if (dup_referred) {
        await referral_collection.updateOne(
          { _id: referral_oid, referred_rewarded: false },
          {
            $set: {
              referred_rewarded: true,
              first_delivered_order_id: order_id,
              modified: new Date(),
            },
          }
        );
        referred_credited = true;
      } else {
        const referred_claim = await referral_collection.findOneAndUpdate(
          { _id: referral_oid, referred_rewarded: false },
          {
            $set: {
              referred_rewarded: true,
              first_delivered_order_id: order_id,
              modified: new Date(),
            },
          },
          { returnDocument: "before" }
        );
        if (referred_claim && referred_claim.value) {
          const referred_amount = parseFloat(
            referred_claim.value.referred_reward_amount || 3
          );
          const referred_member = await member_collection.findOne(
            { _id: referred_id },
            { projection: { _id: 1, wallet: 1 } }
          );
          if (!referred_member) {
            await referral_collection.updateOne(
              { _id: referral_oid },
              {
                $set: {
                  referred_rewarded: false,
                  first_delivered_order_id: null,
                  modified: new Date(),
                },
              }
            );
            return { applied: false, reason: "referred_member_not_found" };
          }
          try {
            const old_w = common.getFixedPrice(referred_member.wallet || 0);
            const new_w = common.getFixedPrice(
              parseFloat(old_w) + referred_amount
            );
            await wallet_history_collection.insertOne({
              member_id: referred_id,
              referral_id: referral_oid,
              referrer_id: ObjectID(
                referred_claim.value.referrer_id.toString()
              ),
              referred_id,
              order_id,
              old_wallet: old_w,
              new_wallet: new_w,
              type: "referral_referred_reward",
              notes: `Referral reward (referred) after first delivered order ${order._id.toString()}`,
              created: new Date(),
            });
            await member_collection.updateOne(
              { _id: referred_id },
              { $set: { wallet: new_w } }
            );
            referred_credited = true;
          } catch (e) {
            await referral_collection.updateOne(
              { _id: referral_oid },
              {
                $set: {
                  referred_rewarded: false,
                  first_delivered_order_id: null,
                  modified: new Date(),
                },
              }
            );
            throw e;
          }
        }
      }
    }

    // --- Referrer reward ---
    const referral_after = await referral_collection.findOne({
      _id: referral_oid,
    });
    if (!referral_after || referral_after.referrer_rewarded) {
      return {
        applied: referred_credited || referrer_credited,
        referred_credited,
        referrer_credited,
        reason: referral_after?.referrer_rewarded
          ? "referrer_already_rewarded"
          : undefined,
      };
    }

    const existing_referrer_wallet = await wallet_history_collection.findOne(
      {
        type: "referral_referrer_reward",
        referral_id: referral_oid,
      },
      { projection: { _id: 1 } }
    );
    if (existing_referrer_wallet) {
      await referral_collection.updateOne(
        { _id: referral_oid, referrer_rewarded: false },
        {
          $set: {
            referrer_rewarded: true,
            first_delivered_order_id: order_id,
            modified: new Date(),
          },
        }
      );
      return {
        applied: true,
        referred_credited,
        referrer_credited: true,
        reason: "referrer_wallet_already_exists",
      };
    }

    const referral_claim = await referral_collection.findOneAndUpdate(
      {
        _id: referral_oid,
        referrer_rewarded: false,
      },
      {
        $set: {
          referrer_rewarded: true,
          first_delivered_order_id: order_id,
          modified: new Date(),
        },
      },
      { returnDocument: "before" }
    );

    if (!referral_claim || !referral_claim.value) {
      return {
        applied: referred_credited,
        referred_credited,
        referrer_credited: false,
      };
    }

    const ref_before = referral_claim.value;
    const referrer_id = ObjectID(ref_before.referrer_id.toString());
    const reward_amount = parseFloat(ref_before.referrer_reward_amount || 3);

    const referrer = await member_collection.findOne(
      { _id: referrer_id },
      { projection: { _id: 1, wallet: 1 } }
    );
    if (!referrer) {
      await referral_collection.updateOne(
        { _id: referral_oid },
        {
          $set: {
            referrer_rewarded: false,
            modified: new Date(),
          },
        }
      );
      return {
        applied: referred_credited,
        referred_credited,
        referrer_credited: false,
        reason: "referrer_not_found",
      };
    }

    const old_wallet = common.getFixedPrice(referrer.wallet || 0);
    const new_wallet = common.getFixedPrice(
      parseFloat(old_wallet) + reward_amount
    );

    await wallet_history_collection.insertOne({
      member_id: referrer_id,
      referral_id: referral_oid,
      referred_id,
      order_id,
      old_wallet,
      new_wallet,
      type: "referral_referrer_reward",
      notes: `Referral reward (referrer) after first delivered order ${order._id.toString()}`,
      created: new Date(),
    });

    await member_collection.updateOne(
      { _id: referrer_id },
      { $set: { wallet: new_wallet } }
    );
    referrer_credited = true;

    return {
      applied: true,
      referred_credited,
      referrer_credited: true,
      referrer_id: referrer_id.toString(),
    };
  } catch (e) {
    console.error("[reward_referrer_on_first_delivered_order]", e);
    return { applied: false, reason: "unexpected_error" };
  }
};
