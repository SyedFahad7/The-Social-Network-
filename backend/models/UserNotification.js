const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  
  // Delivery status
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date,
  
  // Read status
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  
  // Delivery method status
  deliveryMethods: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    dashboard: {
      shown: { type: Boolean, default: false },
      shownAt: Date
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
userNotificationSchema.index({ user: 1, notification: 1 }, { unique: true });
userNotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('UserNotification', userNotificationSchema); 