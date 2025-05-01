const ObjectID = require('mongodb').ObjectID;
const axios = require('axios');
const common = require("../../libraries/common");
const config = require('../../libraries/config');

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

module.exports.cashback_whatsapp_message = async (recipitent_phone, amount, lang = "ar", fallback_message = "") => {
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
}