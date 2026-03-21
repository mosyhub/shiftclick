const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');

const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
  'piss', 'cock', 'dick', 'pussy', 'ass', 'whore', 'slut', 'nigger',
  'faggot', 'retard', 'bullshit', 'motherfucker', 'putang', 'gago',
  'tangina', 'puta', 'bobo', 'tanga', 'ulol', 'pakyu', 'tarantado',
];

const containsProfanity = (text) => {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
};

// @desc    Create a review (verified purchase only)
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, title, comment } = req.body;

    if (!productId || !orderId || !rating || !comment) {
      return res.status(400).json({ message: 'Product, order, rating, and comment are required.' });
    }

    if (containsProfanity(comment) || containsProfanity(title)) {
      return res.status(400).json({ message: 'Your review contains inappropriate language. Please revise it.' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This order does not belong to you.' });
    }
    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'You can only review products from delivered orders.' });
    }

    const orderedProduct = order.items.find(
      (item) => item.product?.toString() === productId || item._id?.toString() === productId
    );
    if (!orderedProduct) {
      return res.status(400).json({ message: 'This product was not part of the specified order.' });
    }

    const existing = await Review.findOne({ user: req.user._id, product: productId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this product.' });
    }

    const review = await Review.create({
      user: req.user._id,
      product: productId,
      order: orderId,
      rating,
      title: title || '',
      comment,
    });

    await updateProductRating(productId);

    const populated = await Review.findById(review._id).populate('user', 'name avatar');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const { rating, sort } = req.query;

    const filter = { product: req.params.productId };
    if (rating) filter.rating = Number(rating);

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'highest') sortOption = { rating: -1 };
    if (sort === 'lowest') sortOption = { rating: 1 };

    const reviews = await Review.find(filter).sort(sortOption).populate('user', 'name avatar');

    const all = await Review.find({ product: req.params.productId });
    const summary = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, total: all.length, average: 0 };
    all.forEach((r) => { summary[r.rating] = (summary[r.rating] || 0) + 1; });
    if (all.length > 0) {
      summary.average = (all.reduce((sum, r) => sum + r.rating, 0) / all.length).toFixed(1);
    }

    res.json({ reviews, summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my review for a specific product
// @route   GET /api/reviews/my/:productId
// @access  Private
const getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      user: req.user._id,
      product: req.params.productId,
    }).populate('user', 'name avatar');
    res.json(review || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews by the logged-in user
// @route   GET /api/reviews/my-all
// @access  Private
const getMyAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'name images');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all reviews (admin)
// @route   GET /api/reviews
// @access  Admin
const getAllReviews = async (req, res) => {
  try {
    const { rating, sort } = req.query;
    const filter = {};
    if (rating) filter.rating = Number(rating);

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'highest') sortOption = { rating: -1 };
    if (sort === 'lowest') sortOption = { rating: 1 };

    const reviews = await Review.find(filter)
      .sort(sortOption)
      .populate('user', 'name email avatar')
      .populate('product', 'name images');

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update own review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const { rating, title, comment } = req.body;

    if (containsProfanity(comment) || containsProfanity(title)) {
      return res.status(400).json({ message: 'Your review contains inappropriate language. Please revise it.' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own reviews.' });
    }

    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment) review.comment = comment;

    await review.save();
    await updateProductRating(review.product);

    const populated = await Review.findById(review._id).populate('user', 'name avatar');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a review (admin only)
// @route   DELETE /api/reviews/:id
// @access  Admin
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    const productId = review.product;
    await Review.findByIdAndDelete(req.params.id);
    await updateProductRating(productId);

    res.json({ message: 'Review deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if user can review a product
// @route   GET /api/reviews/can-review/:productId
// @access  Private
const canReview = async (req, res) => {
  try {
    const { productId } = req.params;

    const deliveredOrder = await Order.findOne({
      user: req.user._id,
      status: 'Delivered',
      'items.product': productId,
    });

    if (!deliveredOrder) {
      return res.json({ canReview: false, orderId: null, reason: 'No delivered order found for this product.' });
    }

    const existing = await Review.findOne({ user: req.user._id, product: productId });
    if (existing) {
      return res.json({ canReview: false, orderId: deliveredOrder._id, alreadyReviewed: true, reviewId: existing._id });
    }

    res.json({ canReview: true, orderId: deliveredOrder._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProductRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  if (reviews.length === 0) {
    await Product.findByIdAndUpdate(productId, { rating: 0, numReviews: 0 });
  } else {
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(productId, {
      rating: Math.round(avg * 10) / 10,
      numReviews: reviews.length,
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getMyReview,
  getMyAllReviews,
  getAllReviews,
  updateReview,
  deleteReview,
  canReview,
};