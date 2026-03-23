const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 [Admin] Fetching dashboard stats...');
    console.log('👤 [Admin] Authenticated user:', req.user?.email, 'Role:', req.user?.role);

    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const reviewCount = await Review.countDocuments();

    console.log('✅ [Admin] Stats retrieved:', { userCount, productCount, orderCount, reviewCount });

    res.json({
      users: userCount,
      products: productCount,
      orders: orderCount,
      reviews: reviewCount
    });
  } catch (error) {
    console.error('❌ [Admin] Error fetching stats:', error.message);
    res.status(500).json({ 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const applyPromotion = async (req, res) => {
  try {
    const { productId, discount, sendNotification = false } = req.body;

    // Validate input
    if (!productId || discount === undefined) {
      return res.status(400).json({ message: 'Product ID and discount are required' });
    }

    if (discount < 0 || discount > 100) {
      return res.status(400).json({ message: 'Discount must be between 0 and 100' });
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      { discount: Number(discount) },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let notificationResult = {
      sent: false,
      sentCount: 0,
      message: 'Discount updated successfully'
    };

    if (sendNotification && discount > 0) {
      try {
        const users = await User.find({ "expoPushTokens.0": { $exists: true } });
        
        console.log(`📱 Found ${users.length} users with push tokens`);
        
        let messages = [];
        let tokenMap = {};

        for (let user of users) {
          console.log(`👤 User: ${user.email}, tokens: ${user.expoPushTokens.length}`);
          
          for (let pushToken of user.expoPushTokens) {
            console.log(`🔑 Token: ${pushToken.token.substring(0, 20)}..., Valid: ${Expo.isExpoPushToken(pushToken.token)}`);
            
            if (!Expo.isExpoPushToken(pushToken.token)) {
              console.warn(`⚠️  Invalid Expo token for user ${user.email}`);
              continue;
            }
            
            const discountedPrice = +(product.price * (1 - discount / 100)).toFixed(2);
            
            const message = {
              to: pushToken.token,
              sound: 'default',
              title: `${discount}% OFF on ${product.name}!`,
              body: `Now ₱${discountedPrice} (was ₱${product.price})`,
              data: {
                productId: product._id.toString(),
                discount: discount,
                originalPrice: product.price,
                discountedPrice: discountedPrice,
                screen: 'ProductDetail'
              },
            };

            messages.push(message);
            tokenMap[pushToken.token] = user._id;
          }
        }

        console.log(`📨 Total messages to send: ${messages.length}`);
        
        let sentCount = 0;
        let failedTokens = [];
        
        if (messages.length === 0) {
          console.warn('⚠️  No valid push tokens found to send notifications');
          notificationResult = {
            sent: false,
            sentCount: 0,
            message: 'Discount updated, but no valid push tokens found to send notifications'
          };
        } else {
          let chunks = expo.chunkPushNotifications(messages);
          console.log(`📦 Chunked into ${chunks.length} chunk(s)`);
          
          for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
            let chunk = chunks[chunkIdx];
            console.log(`📤 Sending chunk ${chunkIdx + 1}/${chunks.length} with ${chunk.length} messages...`);
            
            try {
              const results = await expo.sendPushNotificationsAsync(chunk);
              console.log(`✅ Chunk ${chunkIdx + 1} sent, results:`, results);
              
              for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const tokenObj = chunk[i];
                const userId = tokenMap[tokenObj.to];

                if (result.status === 'ok') {
                  sentCount++;
                  console.log(`✅ Message sent successfully to token: ${tokenObj.to.substring(0, 20)}...`);
                 
                  await Notification.create({
                    recipientId: userId,
                    title: tokenObj.title,
                    body: tokenObj.body,
                    data: tokenObj.data,
                    type: 'promotion',
                    expoToken: tokenObj.to,
                    status: 'sent',
                    sentAt: new Date(),
                  });
                } else {
                  failedTokens.push(tokenObj.to);
                  console.error(`❌ Message failed for token ${tokenObj.to.substring(0, 20)}...:`, result);
                
                  await Notification.create({
                    recipientId: userId,
                    title: tokenObj.title,
                    body: tokenObj.body,
                    data: tokenObj.data,
                    type: 'promotion',
                    expoToken: tokenObj.to,
                    status: 'failed',
                    errorMessage: result.message || 'Unknown error',
                  });
                }
              }
            } catch (chunkError) {
              console.error(`\n❌ Error sending chunk ${chunkIdx + 1}:`, chunkError.message);
              console.error('Chunk error details:', chunkError);
              
              // Handle multi-project conflict
              if (chunkError.code === 'PUSH_TOO_MANY_EXPERIENCE_IDS' && chunkError.details) {
                console.error(`\n⚠️  MULTI-PROJECT CONFLICT DETECTED!`);
                console.error(`Projects found:`, Object.keys(chunkError.details));
                
                // Identify old and current projects
                const projectEntries = Object.entries(chunkError.details);
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
                    
                    const discountedPrice = +(product.price * (1 - discount / 100)).toFixed(2);
                    
                    const message = {
                      to: pushToken.token,
                      sound: 'default',
                      title: `${discount}% OFF on ${product.name}!`,
                      body: `Now ₱${discountedPrice} (was ₱${product.price})`,
                      data: {
                        productId: product._id.toString(),
                        discount: discount,
                        originalPrice: product.price,
                        discountedPrice: discountedPrice,
                        screen: 'ProductDetail'
                      },
                    };
                    
                    messages.push(message);
                    tokenMap[pushToken.token] = user._id;
                  }
                }
                
                console.log(`\n📨 Valid messages after cleanup: ${messages.length}`);
                
                // Retry with cleaned up messages
                if (messages.length > 0) {
                  console.log(`\n🔄 RETRYING BROADCAST WITH ${messages.length} VALID TOKENS...\n`);
                  
                  const retryChunks = expo.chunkPushNotifications(messages);
                  
                  for (let retryChunkIdx = 0; retryChunkIdx < retryChunks.length; retryChunkIdx++) {
                    const retryChunk = retryChunks[retryChunkIdx];
                    
                    try {
                      console.log(`📤 Retry chunk ${retryChunkIdx + 1}/${retryChunks.length} with ${retryChunk.length} messages...`);
                      const retryResults = await expo.sendPushNotificationsAsync(retryChunk);
                      
                      for (let i = 0; i < retryResults.length; i++) {
                        const result = retryResults[i];
                        const tokenObj = retryChunk[i];
                        const userId = tokenMap[tokenObj.to];
                        
                        if (result.status === 'ok') {
                          sentCount++;
                          console.log(`✅ Retry successful: ${tokenObj.to.substring(0, 20)}...`);
                          await Notification.create({
                            recipientId: userId,
                            title: tokenObj.title,
                            body: tokenObj.body,
                            data: tokenObj.data,
                            type: 'promotion',
                            expoToken: tokenObj.to,
                            status: 'sent',
                            sentAt: new Date(),
                          });
                        } else {
                          failedTokens.push(tokenObj.to);
                          console.error(`❌ Retry failed: ${tokenObj.to.substring(0, 20)}...`);
                        }
                      }
                    } catch (retryErr) {
                      console.error(`❌ Retry chunk error:`, retryErr.message);
                    }
                  }
                }
              }
            }
          }

          notificationResult = {
            sent: true,
            sentCount,
            failedTokens,
            message: `Discount applied and notification sent to ${sentCount} user(s) (${failedTokens.length} failed)`
          };
          
          console.log(`\n📊 Promotion notification summary:`, notificationResult);
        }
      } catch (error) {
        console.error('❌ Error sending promotion notification:', error.message);
        console.error('Full error:', error);
        notificationResult.message += ' (but notification sending failed - see logs)';
      }
    }

    res.json({
      product,
      promotion: notificationResult
    });
  } catch (error) {
    console.error('Error applying promotion:', error.message);
    res.status(500).json({ 
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = { getDashboardStats, applyPromotion };