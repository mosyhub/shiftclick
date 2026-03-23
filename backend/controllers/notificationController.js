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

    console.log(`\n🎯 DEBUG: Broadcast Notification`);
    console.log(`📢 Title: ${title}`);
    console.log(`📝 Body: ${body}`);
    console.log(`🏷️  Type: ${type}`);

    const users = await User.find({ "expoPushTokens.0": { $exists: true } });
    console.log(`👥 Found ${users.length} users with push tokens`);
    
    let messages = [];
    let tokenMap = {};
    let projectConflicts = {};

    for (let user of users) {
      console.log(`\n👤 User: ${user.email}, tokens: ${user.expoPushTokens.length}`);
      
      for (let pushToken of user.expoPushTokens) {
        const tokenStr = pushToken.token;
        
        if (!Expo.isExpoPushToken(tokenStr)) {
          console.log(`   ⚠️  Invalid token format: ${tokenStr.substring(0, 20)}...`);
          continue;
        }
        
        console.log(`   🔑 Token: ${tokenStr.substring(0, 15)}..., Valid: true`);
        messages.push({
          to: tokenStr,
          sound: 'default',
          title: title || 'ShiftClick Notification',
          body: body || 'You have a new notification',
          data: { ...data, screen: 'PromoDetail' },
        });

        tokenMap[tokenStr] = user._id;
      }
    }

    console.log(`\n📨 Total messages to send: ${messages.length}`);
    
    let sentCount = 0;
    let failedCount = 0;
    let retryTokens = [];

    let chunks = expo.chunkPushNotifications(messages);
    console.log(`📦 Chunked into ${chunks.length} chunk(s)`);
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`\n📤 Sending chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} messages...`);
      
      try {
        const results = await expo.sendPushNotificationsAsync(chunk);
        console.log(`✅ Expo API Response received:`, results);
        
        // Process results
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const message = chunk[i];
          const userId = tokenMap[message.to];
          
          console.log(`\n🔹 Result ${i + 1}:`, result);
          
          if (result.status === 'ok') {
            sentCount++;
            console.log(`✅ Notification sent to ${message.to.substring(0, 20)}... (User: ${userId})`);
            
            // Save notification record
            await Notification.create({
              recipientId: userId,
              title,
              body,
              data,
              type,
              expoToken: message.to,
              status: 'sent',
            });
          } else {
            failedCount++;
            console.error(`❌ Notification failed for ${message.to.substring(0, 20)}... (User: ${userId})`);
            console.error(`   Error: ${result.message}`);
            
            // Save failed notification record
            await Notification.create({
              recipientId: userId,
              title,
              body,
              data,
              type,
              expoToken: message.to,
              status: 'failed',
              errorMessage: result.message || 'Unknown error',
            });
          }
        }
      } catch (error) {
        console.error(`\n❌ Error sending chunk ${chunkIndex + 1}:`, error.message);
        
        // Check if it's a multi-project error
        if (error.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && error.details) {
          console.error(`\n⚠️  MULTI-PROJECT CONFLICT DETECTED!`);
          console.error(`Projects found in tokens:`, Object.keys(error.details));
          
          // Identify old and current projects
          const projectEntries = Object.entries(error.details);
          const oldProjects = ['@ntwny/frontend']; // Known old projects
          const oldTokens = [];
          const validTokens = [];
          
          for (const [project, tokens] of projectEntries) {
            console.error(`   Project: ${project}, Tokens: ${tokens.length}`);
            if (oldProjects.includes(project)) {
              oldTokens.push(...tokens);
            } else {
              validTokens.push(...tokens);
            }
          }
          
          console.log(`\n🗑️  REMOVING ${oldTokens.length} OLD PROJECT TOKENS FROM DATABASE...`);
          console.log(`✅ KEEPING ${validTokens.length} CURRENT PROJECT TOKENS...`);
          
          // Remove ONLY old project tokens from database
          if (oldTokens.length > 0) {
            const usersToUpdate = await User.find({ 
              'expoPushTokens.token': { $in: oldTokens }
            });
            
            let totalRemoved = 0;
            for (let user of usersToUpdate) {
              const beforeCount = user.expoPushTokens.length;
              user.expoPushTokens = user.expoPushTokens.filter(t => !oldTokens.includes(t.token));
              const afterCount = user.expoPushTokens.length;
              
              if (beforeCount !== afterCount) {
                await user.save();
                totalRemoved += (beforeCount - afterCount);
                console.log(`✅ Removed ${beforeCount - afterCount} old token(s) from ${user.email}`);
              }
            }
            
            console.log(`\n✅ Total old tokens removed from database: ${totalRemoved}`);
          }
          
          // Rebuild messages with ONLY valid project tokens
          console.log(`\n🔄 REBUILDING MESSAGE LIST WITH VALID PROJECT TOKENS...\n`);
          
          messages = [];
          tokenMap = {};
          
          const validUsers = await User.find({ "expoPushTokens.0": { $exists: true } });
          
          for (let user of validUsers) {
            for (let pushToken of user.expoPushTokens) {
              // Only include tokens from valid projects
              if (!validTokens.includes(pushToken.token)) {
                console.log(`   ⏭️  Skipping old project token: ${pushToken.token.substring(0, 20)}...`);
                continue;
              }
              
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
          
          console.log(`\n📨 Valid messages after cleanup: ${messages.length}`);
          
          // Retry with cleaned up messages
          if (messages.length > 0) {
            console.log(`\n🔄 RETRYING BROADCAST WITH ${messages.length} VALID TOKENS...\n`);
            
            const retryChunks = expo.chunkPushNotifications(messages);
            
            for (let retryChunkIndex = 0; retryChunkIndex < retryChunks.length; retryChunkIndex++) {
              const retryChunk = retryChunks[retryChunkIndex];
              
              try {
                console.log(`📤 Retry chunk ${retryChunkIndex + 1}/${retryChunks.length} with ${retryChunk.length} messages...`);
                const retryResults = await expo.sendPushNotificationsAsync(retryChunk);
                
                for (let i = 0; i < retryResults.length; i++) {
                  const result = retryResults[i];
                  const message = retryChunk[i];
                  const userId = tokenMap[message.to];
                  
                  if (result.status === 'ok') {
                    sentCount++;
                    console.log(`✅ Retry successful: ${message.to.substring(0, 20)}...`);
                    await Notification.create({
                      recipientId: userId,
                      title,
                      body,
                      data,
                      type,
                      expoToken: message.to,
                      status: 'sent',
                    });
                  } else {
                    failedCount++;
                    console.error(`❌ Retry failed: ${message.to.substring(0, 20)}...`);
                  }
                }
              } catch (retryErr) {
                console.error(`❌ Retry chunk error:`, retryErr.message);
              }
            }
          }
        } else {
          console.error(`❌ Full error:`, error);
        }
      }
    }

    console.log(`\n📊 Promotion notification summary: {`);
    console.log(`  sent: true,`);
    console.log(`  sentCount: ${sentCount},`);
    console.log(`  failedCount: ${failedCount},`);
    console.log(`  conflictingTokens: ${retryTokens.length}`);
    console.log(`}`);

    res.json({ 
      message: `Broadcast sent to ${sentCount} devices.`,
      totalDevices: messages.length,
      sentCount,
      failedCount,
      conflictingTokens: retryTokens.length
    });
  } catch (error) {
    console.error('❌ Error in broadcast:', error.message);
    console.error('❌ Full error:', error);
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

const cleanupConflictingTokens = async (req, res) => {
  try {
    console.log('\n🧹 CLEANING UP CONFLICTING TOKENS\n');
    
    const conflictingProjects = ['@ntwny/frontend'];
    const users = await User.find({ "expoPushTokens.0": { $exists: true } });
    
    let totalRemoved = 0;
    let usersAffected = 0;

    for (let user of users) {
      const initialCount = user.expoPushTokens.length;
      
      // Remove tokens that appear to be from conflicting projects
      // These are identified by checking if they match known conflicting project IDs
      user.expoPushTokens = user.expoPushTokens.filter((tokenObj) => {
        // Keep all tokens for now (Expo tokens don't reveal project info)
        // Instead, we'll track which ones failed in the broadcast error
        return true;
      });
      
      const removedCount = initialCount - user.expoPushTokens.length;
      if (removedCount > 0) {
        await user.save();
        totalRemoved += removedCount;
        usersAffected++;
        console.log(`✅ User ${user.email}: Removed ${removedCount} token(s)`);
      }
    }

    console.log(`\n📊 CLEANUP SUMMARY:`);
    console.log(`👥 Total users checked: ${users.length}`);
    console.log(`👤 Users affected: ${usersAffected}`);
    console.log(`🔑 Total tokens removed: ${totalRemoved}\n`);

    res.json({
      message: 'Cleanup complete',
      totalUsersChecked: users.length,
      usersAffected,
      tokensRemoved: totalRemoved,
    });
  } catch (error) {
    console.error('❌ Error cleaning up conflicting tokens:', error);
    res.status(500).json({ message: error.message });
  }
};

const removeSpecificTokens = async (req, res) => {
  try {
    const { tokens } = req.body;
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of tokens to remove' });
    }

    console.log(`\n🗑️  REMOVING SPECIFIC TOKENS: ${tokens.length} token(s)\n`);

    const users = await User.find({ 
      'expoPushTokens.token': { $in: tokens }
    });

    let removedCount = 0;

    for (let user of users) {
      const beforeCount = user.expoPushTokens.length;
      user.expoPushTokens = user.expoPushTokens.filter(t => !tokens.includes(t.token));
      const afterCount = user.expoPushTokens.length;
      
      if (beforeCount !== afterCount) {
        await user.save();
        removedCount += (beforeCount - afterCount);
        console.log(`✅ User ${user.email}: Removed ${beforeCount - afterCount} token(s)`);
      }
    }

    console.log(`\n📊 Total tokens removed: ${removedCount}\n`);

    res.json({
      message: `Removed ${removedCount} token(s)`,
      tokensRemoved: removedCount,
    });
  } catch (error) {
    console.error('❌ Error removing tokens:', error);
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
  cleanupConflictingTokens,
  removeSpecificTokens,
  testPushNotifications,
};