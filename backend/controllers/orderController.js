const Order = require('../models/Order');
const Product = require('../models/Product');
const { Expo } = require('expo-server-sdk');
const User = require('../models/User');
const Notification = require('../models/Notification');

const expo = new Expo();


const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, subtotal, shippingFee, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

  
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product "${item.name}" not found in database` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
    }

   
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    const paymentStatusValue = (paymentMethod && paymentMethod !== 'COD') ? 'Paid' : 'Pending';

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod: paymentMethod || 'COD',
      paymentStatus: paymentStatusValue,
      subtotal,
      shippingFee: shippingFee || 0,
      total,
      status: 'Pending',
      statusHistory: [{ status: 'Pending', note: 'Order placed successfully' }],
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get my orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name images');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name images');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('items.product', 'name images');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status + send push notification
// @route   PUT /api/orders/:id/status
// @access  Private (role-based logic inside)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, paymentStatus } = req.body;
    const isAdmin = req.user.role === 'admin';

    const order = await Order.findById(req.params.id).populate('user');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // --- Role-based permission check ---
    if (isAdmin) {
      // Admin can only move order to Processing or Shipped
      const adminAllowed = ['Processing', 'Shipped'];
      if (!adminAllowed.includes(status)) {
        return res.status(403).json({ message: `Admin can only set status to: ${adminAllowed.join(', ')}` });
      }
    } else {
      // Customer can only mark as Delivered, and only if the order belongs to them
      if (order.user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this order.' });
      }
      if (status !== 'Delivered') {
        return res.status(403).json({ message: 'You can only mark an order as Delivered.' });
      }
      if (order.status !== 'Shipped') {
        return res.status(400).json({ message: 'Order must be Shipped before marking as Delivered.' });
      }
    }

  
    order.status = status;

    if (status === 'Delivered' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'Paid';
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    order.statusHistory.push({
      status,
      note: note || `Order ${status}`,
      updatedAt: new Date(),
    });

    await order.save();

    // --- Send push notification to customer ---
    console.log(`\n🔍 DEBUG: Order Status Update Notification`);
    console.log(`📋 Order ID: ${order._id}`);
    console.log(`👤 User ID: ${order.user._id}`);
    console.log(`👤 User Email: ${order.user.email}`);
    console.log(`📱 User Object Keys:`, Object.keys(order.user.toObject ? order.user.toObject() : order.user));
    console.log(`📱 expoPushTokens Array:`, order.user.expoPushTokens);
    console.log(`📱 Tokens Count:`, order.user.expoPushTokens?.length || 0);
    
    const pushTokens = order.user?.expoPushTokens || [];
    if (pushTokens.length > 0) {
      const messages = [];
      const tokenMap = {}; // Track which message belongs to which token
      
      for (const tokenObj of pushTokens) {
        console.log(`\n🔹 Processing token:`, tokenObj.token?.substring(0, 20), '...');
        if (!Expo.isExpoPushToken(tokenObj.token)) {
          console.log(`⚠️  Invalid Expo token format`);
          continue;
        }
        
        const message = {
          to: tokenObj.token,
          sound: 'default',
          title: `Order ${status} 📦`,
          body: `Your order #${order._id.toString().slice(-6).toUpperCase()} is now ${status}`,
          data: { orderId: order._id.toString(), screen: 'OrderDetail' },
        };
        messages.push(message);
        tokenMap[tokenObj.token] = tokenObj;
      }
      
      if (messages.length > 0) {
        const chunks = expo.chunkPushNotifications(messages);
        console.log(`\n📨 Order notification: ${messages.length} messages in ${chunks.length} chunk(s)`);
        
        for (const chunk of chunks) {
          try { 
            console.log(`\n📤 Sending chunk with ${chunk.length} messages...`);
            const results = await expo.sendPushNotificationsAsync(chunk);
            console.log(`✅ Expo API Response received:`, results);
            
            // Process results and save notification records only for successful sends
            for (let i = 0; i < results.length; i++) {
              const result = results[i];
              const message = chunk[i];
              const tokenObj = tokenMap[message.to];
              
              console.log(`\n🔹 Result ${i + 1}:`, result);
              try {
                if (result.status === 'ok') {
                  console.log(`✅ Order notification sent to ${message.to.substring(0, 20)}...`);
                  await Notification.create({
                    recipientId: order.user._id,
                    title: message.title,
                    body: message.body,
                    data: message.data,
                    type: 'order',
                    expoToken: message.to,
                    status: 'sent',
                    sentAt: new Date(),
                  });
                } else {
                  console.error(`❌ Order notification failed for ${message.to.substring(0, 20)}...`, result);
                  await Notification.create({
                    recipientId: order.user._id,
                    title: message.title,
                    body: message.body,
                    data: message.data,
                    type: 'order',
                    expoToken: message.to,
                    status: 'failed',
                    errorMessage: result.message || 'Unknown error',
                    sentAt: new Date(),
                  });
                }
              } catch (dbErr) {
                console.error('❌ Error saving notification to DB:', dbErr.message);
              }
            }
          }
          catch (err) { 
            console.error('❌ Push error:', err.message);
            console.error('❌ Full error:', err);
          }
        }
      } else {
        console.log(`⚠️  No valid tokens found to send notifications`);
      }
    } else {
      console.log(`⚠️  No push tokens found for user ${order.user._id}`);
    }

    res.json(order);
  } catch (error) {
    console.error(`\n❌ ERROR in updateOrderStatus:`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Stack: ${error.stack}`);
    console.error(`Full Error:`, error);
    res.status(400).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
};