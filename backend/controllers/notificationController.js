const User = require('../models/User');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();

// @desc    Send broadcast notification to all users (Promotions)
// @route   POST /api/notifications/broadcast
// @access  Admin
const sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body, data } = req.body; // e.g. "SALE!", body: "50% off keyboards" 

    // fetch all users with Expo push tokens
    const users = await User.find({ "expoPushTokens.0": { $exists: true } });
    
    let messages = [];
    for (let user of users) {
      for (let pushToken of user.expoPushTokens) {
        if (!Expo.isExpoPushToken(pushToken.token)) continue;
        
        messages.push({
          to: pushToken.token,
          sound: 'default',
          title: title,
          body: body,
          data: { ...data, screen: 'PromoDetail' }, // Quiz 2 part 2: navigation data
        });
      }
    }

    // Send notifications in chunks to avoid rate limits
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    res.json({ message: `Broadcast sent to ${messages.length} devices.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendBroadcastNotification };