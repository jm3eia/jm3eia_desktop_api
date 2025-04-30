const admin = require("firebase-admin");
const serviceAccount = require("./jm3eia-9185b-firebase-adminsdk-idn96-7c207925d3.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports.send_to_multiple = (message, device_tokens) => {
  const notificationData = {
    body: this.message.body,
    title: this.message.title,
  };

  if (this.message.image) {
    notificationData.imageUrl = `https://media.jm3eia.com${this.message.image}`;
  }

  const message = {
    tokens: device_tokens,
    notification: notificationData,
    data: {
      url: message.url || null,
      click_action: "FLUTTER_NOTIFICATION_CLICK",
      wallet: true,
      id: "1",
      status: "done",
    },
  };

  console.error("MESSAGE: ", message);

  return admin
    .messaging()
    .sendEachForMulticast(message)
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
