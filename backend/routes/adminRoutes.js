const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [users, products, orders, reviews] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Review.countDocuments(),
    ]);
    res.json({ users, products, orders, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;