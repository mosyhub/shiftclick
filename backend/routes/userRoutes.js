const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  googleSignIn,
  getMyProfile,
  updateProfile,
  updatePassword,
  savePushToken,
  removePushToken,
  getAllUsers,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// Public
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-signin', googleSignIn);

// Private
router.get('/me', protect, getMyProfile);
router.put('/me', protect, upload.single('avatar'), updateProfile);
router.put('/password', protect, updatePassword);
router.post('/push-token', protect, savePushToken);
router.delete('/push-token', protect, removePushToken);

// Admin
router.get('/', protect, adminOnly, getAllUsers);
router.put('/:userId/toggle-status', protect, adminOnly, toggleUserStatus);

module.exports = router;