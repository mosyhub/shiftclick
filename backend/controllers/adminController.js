// File: controllers/adminController.js
const Product = require('../models/Product');
const User = require('../models/User'); // Assuming you have a User model
const Order = require('../models/Order'); // Uncomment when you have an Order model
const Review = require('../models/Review'); // Uncomment when you have a Review model

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

module.exports = { getDashboardStats };