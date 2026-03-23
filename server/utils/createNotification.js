const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  sender,
  senderName,
  note,
  type,
  message,
}) => {
  try {
    if (!recipient || !sender || !senderName || !note || !type || !message) {
      return null;
    }

    if (recipient.toString() === sender.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      senderName,
      note,
      type,
      message,
    });

    return notification;
  } catch (error) {
    console.error("Create notification error:", error.message);
    return null;
  }
};

module.exports = createNotification;
