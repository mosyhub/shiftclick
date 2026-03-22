const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    title: { 
      type: String, 
      required: [true, 'Title is required'], 
      trim: true 
    },
    body: { 
      type: String, 
      required: [true, 'Body is required'] 
    },
    data: {
      screen: { type: String },
      orderId: { type: mongoose.Schema.Types.Mixed },
      productId: { type: mongoose.Schema.Types.Mixed },
      promoId: { type: String },
      isTest: { type: Boolean },
      custom: { type: mongoose.Schema.Types.Mixed },
    },
    type: { 
      type: String, 
      enum: ['order', 'promotion', 'alert', 'review', 'custom'], 
      default: 'custom' 
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    readAt: { 
      type: Date 
    },
    sentAt: { 
      type: Date, 
      default: Date.now 
    },
    expoToken: { 
      type: String,
      required: true
    },
    status: { 
      type: String, 
      enum: ['sent', 'failed', 'pending'], 
      default: 'pending' 
    },
    errorMessage: String,
    retries: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

// Index for faster queries
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
