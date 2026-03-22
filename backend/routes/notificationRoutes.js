const express = require('express');
const router = express.Router();
const { sendBroadcastNotification } = require('../controllers/notificationController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/broadcast', protect, adminOnly, sendBroadcastNotification);

module.exports = router;