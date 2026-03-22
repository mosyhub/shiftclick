// File: controllers/adminController.js
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { Expo } = require('expo-server-sdk');

let expo = new Expo();

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Admin Only
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

// @desc    Apply discount to product and send promotion notification
// @route   POST /api/admin/apply-promotion
// @access  Admin Only
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

    // Update product discount
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

    // Send promotion notification if requested
    if (sendNotification && discount > 0) {
      try {
        const users = await User.find({ "expoPushTokens.0": { $exists: true } });
        
        let messages = [];
        let tokenMap = {};

        for (let user of users) {
          for (let pushToken of user.expoPushTokens) {
            if (!Expo.isExpoPushToken(pushToken.token)) {
              continue;
            }
            
            const discountedPrice = +(product.price * (1 - discount / 100)).toFixed(2);
            
            const message = {
              to: pushToken.token,
              sound: 'default',
              title: `${discount}% OFF on ${product.name}!`,
              body: `Now ₱${discountedPrice} (was ₱${product.price})`,
              data: {
                productId: product._id,
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

        let sentCount = 0;
        let failedTokens = [];

        // Send notifications in chunks to avoid rate limits
        let chunks = expo.chunkPushNotifications(messages);
        
        for (let chunk of chunks) {
          try {
            const results = await expo.sendPushNotificationsAsync(chunk);
            
            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              const tokenObj = chunk[i];
              const userId = tokenMap[tokenObj.to];

              if (result.status === 'ok') {
                sentCount++;
                // Save notification record
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
                // Save failed notification record
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
          } catch (error) {
            console.error('Error sending chunk:', error.message);
          }
        }

        notificationResult = {
          sent: true,
          sentCount,
          failedTokens,
          message: `Discount applied and notification sent to ${sentCount} user(s)`
        };
      } catch (error) {
        console.error('Error sending promotion notification:', error.message);
        notificationResult.message += ' (but notification sending failed)';
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