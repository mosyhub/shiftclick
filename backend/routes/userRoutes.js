const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMyProfile,
  updateProfile,
  updatePassword,
  savePushToken,
  removePushToken,
  getAllUsers,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);

// Private
router.get('/me', protect, getMyProfile);
router.put('/me', protect, upload.single('avatar'), updateProfile);
router.put('/password', protect, updatePassword);
router.post('/push-token', protect, savePushToken);
router.delete('/push-token', protect, removePushToken);

// Admin
router.get('/', protect, adminOnly, getAllUsers);

module.exports = router;