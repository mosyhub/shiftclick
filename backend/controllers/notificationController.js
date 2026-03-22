const User = require('../models/User');
const Notification = require('../models/Notification');
const { Expo } = require('expo-server-sdk');
const admin = require('../config/firebase');

let expo = new Expo();

// Helper: Remove stale tokens older than 30 days
const cleanupStaleTokens = (user, daysOld = 30) => {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - daysOld * 24 * 60 * 60 * 1000);
  
  const initialCount = user.expoPushTokens.length;
  user.expoPushTokens = user.expoPushTokens.filter(tokenObj => {
    const tokenDate = new Date(tokenObj.updatedAt);
    return tokenDate > staleThreshold;
  });
  
  const removedCount = initialCount - user.expoPushTokens.length;
  if (removedCount > 0) {
    console.log(`🧹 Removed ${removedCount} stale token(s) for user ${user._id}`);
  }
  
  return removedCount;
};

// @desc    Save or update user's push token
// @route   POST /api/notifications/save-token
// @access  Private
const savePushToken = async (req, res) => {
  try {
    const { token, device } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean up stale tokens (older than 30 days)
    cleanupStaleTokens(user);

    // Check if token already exists
    const tokenExists = user.expoPushTokens.some(t => t.token === token);
    
    if (!tokenExists) {
      user.expoPushTokens.push({
        token,
        device: device || 'Unknown Device',
        updatedAt: new Date(),
      });
      await user.save();
      console.log(`✅ Push token saved for user ${userId}`);
    } else {
      // Update timestamp
      const tokenObj = user.expoPushTokens.find(t => t.token === token);
      tokenObj.updatedAt = new Date();
      await user.save();
      console.log(`✅ Push token updated for user ${userId}`);
    }

    res.json({ 
      message: 'Push token saved successfully',
      token,
      activeTokens: user.expoPushTokens.length,
    });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send notification to a specific user
// @route   POST /api/notifications/send-to-user
// @access  Admin
const sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, data, type = 'custom' } = req.body;

    const user = await User.findById(userId);
    if (!user || user.expoPushTokens.length === 0) {
      return res.status(404).json({ message: 'User or push tokens not found' });
    }

    let sentCount = 0;
    const failedTokens = [];

    for (let pushTokenObj of user.expoPushTokens) {
      const token = pushTokenObj.token;

      if (!Expo.isExpoPushToken(token)) {
        failedTokens.push(token);
        continue;
      }

      try {
        const message = {
          to: token,
          sound: 'default',
          title: title || 'ShiftClick Notification',
          body: body || 'You have a new notification',
          data: data || {},
        };

        await expo.sendPushNotificationsAsync([message]);

        // Save notification record
        await Notification.create({
          recipientId: userId,
          title,
          body,
          data,
          type,
          expoToken: token,
          status: 'sent',
          sentAt: new Date(),
        });

        sentCount++;
      } catch (error) {
        console.error(`Error sending to token ${token}:`, error.message);
        failedTokens.push(token);

        // Save failed notification record
        await Notification.create({
          recipientId: userId,
          title,
          body,
          data,
          type,
          expoToken: token,
          status: 'failed',
          errorMessage: error.message,
        });
      }
    }

    // Remove invalid tokens
    if (failedTokens.length > 0) {
      user.expoPushTokens = user.expoPushTokens.filter(t => !failedTokens.includes(t.token));
      await user.save();
    }

    res.json({
      message: `Notification sent to ${sentCount} device(s)`,
      sentCount,
      failedTokens,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send broadcast notification to all users (Promotions)
// @route   POST /api/notifications/broadcast
// @access  Admin
const sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body, data, type = 'promotion' } = req.body;

    // fetch all users with Expo push tokens
    const users = await User.find({ "expoPushTokens.0": { $exists: true } });
    
    let messages = [];
    let tokenMap = {}; // Map tokens to userId

    for (let user of users) {
      for (let pushToken of user.expoPushTokens) {
        if (!Expo.isExpoPushToken(pushToken.token)) continue;
        
        messages.push({
          to: pushToken.token,
          sound: 'default',
          title: title || 'ShiftClick Notification',
          body: body || 'You have a new notification',
          data: { ...data, screen: 'PromoDetail' },
        });

        tokenMap[pushToken.token] = user._id;
      }
    }

    let sentCount = 0;

    // Send notifications in chunks to avoid rate limits
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        const results = await expo.sendPushNotificationsAsync(chunk);
        
        // Process results
        for (let result of results) {
          if (result.status === 'ok') {
            sentCount++;
            const userId = tokenMap[chunk[results.indexOf(result)].to];
            
            // Save notification record
            await Notification.create({
              recipientId: userId,
              title,
              body,
              data,
              type,
              expoToken: chunk[results.indexOf(result)].to,
              status: 'sent',
            });
          }
        }
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    res.json({ 
      message: `Broadcast sent to ${sentCount} devices.`,
      totalDevices: messages.length,
      sentCount
    });
  } catch (error) {
    console.error('Error in broadcast:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's notifications
// @route   GET /api/notifications/my-notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, skip = 0, isRead } = req.query;

    let query = { recipientId: userId };
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.json({
      notifications,
      total,
      unreadCount,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:notificationId/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:notificationId
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cleanup stale push tokens for all users (Admin)
// @route   POST /api/notifications/cleanup-stale-tokens
// @access  Admin
const cleanupStaleTokensAdmin = async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    // Get all users with push tokens
    const users = await User.find({ 'expoPushTokens.0': { $exists: true } });
    
    let totalRemoved = 0;
    let usersAffected = 0;

    for (let user of users) {
      const beforeCount = user.expoPushTokens.length;
      const removed = cleanupStaleTokens(user, daysOld);
      
      if (removed > 0) {
        await user.save();
        totalRemoved += removed;
        usersAffected++;
      }
    }

    console.log(`\n🧹 STALE TOKEN CLEANUP COMPLETE`);
    console.log(`Total users checked: ${users.length}`);
    console.log(`Users affected: ${usersAffected}`);
    console.log(`Total tokens removed: ${totalRemoved}`);
    console.log(`Tokens older than: ${daysOld} days\n`);

    res.json({
      message: `Cleanup complete: ${totalRemoved} stale token(s) removed`,
      daysOld,
      totalUsersChecked: users.length,
      usersAffected,
      tokensRemoved: totalRemoved,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error cleaning up stale tokens:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  savePushToken,
  sendNotificationToUser,
  sendBroadcastNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupStaleTokensAdmin,
};