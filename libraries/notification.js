const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccountPath = path.join(
  __dirname,
  "jm3eia-9185b-firebase-adminsdk-idn96-7c207925d3.json"
);

let messaging = null;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  messaging = admin.messaging();
} else {
  console.error(
    "[notification] Firebase service account missing, push notifications disabled"
  );
}

module.exports.send_to_multiple = (message, device_tokens) => {
  const notificationData = {
    body: message.body,
    title: message.title,
  };

  if (message.image) {
    notificationData.imageUrl = `https://media.jm3eia.com${message.image}`;
  }

  const message_notif = {
    tokens: device_tokens,
    notification: notificationData,
    data: {
      url: "null",
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      wallet: "true",
      id: "1",
      status: "done",
    },
  };

  console.error("MESSAGE: ", message_notif);

  if (!messaging) {
    return Promise.resolve({
      success: 0,
      failure: 0,
      results: [],
    });
  }

  return messaging
    .sendEachForMulticast(message_notif)
    .then((response) => {
      console.log("Multicast notification sent:", response);
      return {
        success: response.successCount,
        failure: response.failureCount,
        results: response.responses,
      };
    })
    .catch((error) => {
      console.error("Error sending multicast notification:", error);
      console.log("[request.error] ", error.message);
      return {
        success: 0,
        failure: 0,
        results: [],
      };
    });
};

/**
 * Live order tracking push (FCM HTTP v1 via Admin SDK).
 * No top-level notification block — Android card is driven by data; iOS alert lives in apns only.
 */
module.exports.sendTrackingPush = async ({
  token,
  orderId,
  step,
  ongoing = "true",
  alert = "true",
  etaLabel,
  etaRange,
  onTime,
  status,
  guarantee,
  title,
  body,
}) => {
  if (!messaging || !token || !orderId || step == null) {
    return { success: false, skipped: true };
  }

  const collapseId = `order-${orderId}`;
  const message = {
    token,
    android: {
      priority: "high",
      ttl: 600000,
    },
    apns: {
      headers: {
        "apns-collapse-id": collapseId,
        "apns-priority": "10",
      },
      payload: {
        aps: {
          alert: {
            title: String(title || ""),
            body: String(body || status || ""),
          },
          sound: "default",
          "thread-id": collapseId,
        },
      },
    },
    data: {
      orderId: String(orderId),
      step: String(step),
      etaLabel: String(etaLabel || ""),
      etaRange: String(etaRange || ""),
      onTime: String(onTime || ""),
      status: String(status || ""),
      guarantee: String(guarantee || ""),
      alert: String(alert),
      ongoing: String(ongoing),
      url: `jm3eia://tracking/${orderId}`,
    },
  };

  try {
    const messageId = await messaging.send(message);
    return { success: true, messageId };
  } catch (error) {
    console.error("[tracking.push]", orderId, error.message);
    return { success: false, error: error.message };
  }
};
