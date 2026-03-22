const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getDashboardStats, applyPromotion } = require('../controllers/adminController');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
router.get('/stats', protect, adminOnly, getDashboardStats);

// @desc    Apply discount and send promotion notification
// @route   POST /api/admin/apply-promotion
// @access  Admin
router.post('/apply-promotion', protect, adminOnly, applyPromotion);

module.exports = router;