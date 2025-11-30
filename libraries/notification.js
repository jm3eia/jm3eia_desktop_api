const admin = require("firebase-admin");
const serviceAccount = require("./jm3eia-9185b-firebase-adminsdk-idn96-7c207925d3.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports.send_to_multiple = (message, device_tokens) => {
  const notificationData = {
    body: message.body,
    title: message.title,
  };

  if (message.image) {
    notificationData.imageUrl = `https://media.jm3eia.com${this.message.image}`;
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

  return admin
    .messaging()
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
