const express = require('express');
const router = express.Router();
const { 
  savePushToken,
  sendNotificationToUser,
  sendBroadcastNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  cleanupStaleTokensAdmin,
  testPushNotifications,
} = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// User endpoints (Private)
router.post('/save-token', protect, savePushToken);
router.get('/my-notifications', protect, getMyNotifications);
router.put('/:notificationId/read', protect, markAsRead);
router.put('/mark-all-read', protect, markAllAsRead);
router.delete('/:notificationId', protect, deleteNotification);

// Admin endpoints
router.post('/send-to-user', protect, adminOnly, sendNotificationToUser);
router.post('/broadcast', protect, adminOnly, sendBroadcastNotification);
router.post('/cleanup-stale-tokens', protect, adminOnly, cleanupStaleTokensAdmin); // Cleanup stale tokens
router.post('/test', protect, adminOnly, testPushNotifications); // Test push notification system

module.exports = router;