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

const savePushToken = async (req, res) => {
  try {
    const { token, device } = req.body;
    const userId = req.user._id || req.user.id;

    console.log(`📱 Attempting to save push token for user: ${userId}`);
    console.log(`🔑 Token: ${token?.substring(0, 30)}...`);

    if (!token) {
      console.warn('⚠️  No token provided');
      return res.status(400).json({ message: 'Push token is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Found user: ${user.email}`);
    
    cleanupStaleTokens(user);

    const tokenExists = user.expoPushTokens.some(t => t.token === token);
    
    if (!tokenExists) {
      user.expoPushTokens.push({
        token,
        device: device || 'Unknown Device',
        updatedAt: new Date(),
      });
      await user.save();
      console.log(`✅ NEW push token saved for user ${user.email}. Total tokens: ${user.expoPushTokens.length}`);
    } else {
      const tokenObj = user.expoPushTokens.find(t => t.token === token);
      tokenObj.updatedAt = new Date();
      await user.save();
      console.log(`✅ Push token UPDATED for user ${user.email}. Total tokens: ${user.expoPushTokens.length}`);
    }

    res.json({ 
      message: 'Push token saved successfully',
      token,
      activeTokens: user.expoPushTokens.length,
    });
  } catch (error) {
    console.error('❌ Error saving push token:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ message: error.message });
  }
};

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


const sendBroadcastNotification = async (req, res) => {
  try {
    const { title, body, data, type = 'promotion' } = req.body;

    const users = await User.find({ "expoPushTokens.0": { $exists: true } });
    
    let messages = [];
    let tokenMap = {};

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

const cleanupStaleTokensAdmin = async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

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

const testPushNotifications = async (req, res) => {
  try {
    console.log('\n🧪 TESTING PUSH NOTIFICATIONS...\n');

    // Check total users and their tokens
    const allUsers = await User.find({});
    const usersWithTokens = await User.find({ "expoPushTokens.0": { $exists: true } });
    
    console.log(`📊 Test Summary:`);
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Users with tokens: ${usersWithTokens.length}`);
    console.log(`   Users without tokens: ${allUsers.length - usersWithTokens.length}\n`);

    // Get current user tokens
    const currentUser = await User.findById(req.user._id);
    const userTokenCount = currentUser?.expoPushTokens?.length || 0;
    
    console.log(`👤 Current user (${currentUser.email}):`);
    console.log(`   Tokens: ${userTokenCount}`);
    
    if (userTokenCount > 0) {
      currentUser.expoPushTokens.forEach((t, idx) => {
        console.log(`   Token ${idx + 1}: ${t.token.substring(0, 20)}... (${t.device})`);
      });
    }

    // Send test notification to current user if they have tokens
    let testResult = { sent: false, sentCount: 0, message: 'No tokens found' };
    
    if (userTokenCount > 0) {
      console.log(`\n📤 Sending test notification...`);
      
      const messages = currentUser.expoPushTokens.map(t => ({
        to: t.token,
        sound: 'default',
        title: '🧪 Test Notification',
        body: 'If you see this, push notifications are working!',
        data: { type: 'test' },
      }));

      try {
        const results = await expo.sendPushNotificationsAsync(messages);
        console.log(`📤 Send results:`, results);
        
        const successful = results.filter(r => r.status === 'ok').length;
        testResult = {
          sent: true,
          sentCount: successful,
          totalAttempted: messages.length,
          message: `Test notification sent to ${successful}/${messages.length} tokens`,
        };
        
        console.log(`✅ Test result:`, testResult);
      } catch (sendError) {
        console.error(`❌ Error sending test notification:`, sendError.message);
        testResult = {
          sent: false,
          error: sendError.message,
          message: 'Failed to send test notification - see logs',
        };
      }
    }

    // List all tokens across all users
    console.log(`\n📋 All user tokens in system:`);
    let totalTokens = 0;
    usersWithTokens.slice(0, 10).forEach(user => {
      console.log(`   ${user.email}: ${user.expoPushTokens.length} token(s)`);
      totalTokens += user.expoPushTokens.length;
    });
    if (usersWithTokens.length > 10) {
      console.log(`   ... and ${usersWithTokens.length - 10} more users`);
      usersWithTokens.slice(10).forEach(user => {
        totalTokens += user.expoPushTokens.length;
      });
    }
    console.log(`\n📊 Total tokens in system: ${totalTokens}\n`);

    res.json({
      currentUser: {
        email: currentUser.email,
        tokenCount: userTokenCount,
        tokens: currentUser.expoPushTokens.map(t => ({
          token: t.token.substring(0, 30) + '...',
          device: t.device,
          updatedAt: t.updatedAt
        }))
      },
      systemStats: {
        totalUsers: allUsers.length,
        usersWithTokens: usersWithTokens.length,
        totalTokensInSystem: totalTokens,
      },
      testResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in test notifications:', error);
    res.status(500).json({ message: error.message, error });
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
  testPushNotifications,
};