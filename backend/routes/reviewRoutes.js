const express = require('express');
const router = express.Router();
const {
  createReview,
  getProductReviews,
  getMyReview,
  getMyAllReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  canReview,
} = require('../controllers/reviewController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public
router.get('/product/:productId', getProductReviews);

// Private (logged in users)
router.post('/', protect, createReview);
router.get('/my-all', protect, getMyAllReviews);        // all reviews by logged-in user
router.get('/can-review/:productId', protect, canReview);
router.get('/my/:productId', protect, getMyReview);
router.put('/:id', protect, updateReview);

// Admin only
router.get('/', protect, adminOnly, getAllReviews);
router.delete('/:id', protect, adminOnly, deleteReview);

module.exports = router;