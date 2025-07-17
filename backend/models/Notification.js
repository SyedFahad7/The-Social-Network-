const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Sender information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['super-admin', 'teacher', 'student'],
    required: true
  },

  // Recipient targeting
  recipientType: {
    type: String,
    enum: ['all', 'all-students', 'all-teachers', 'year', 'section', 'individual', 'hod'],
    required: true
  },
  recipientFilters: {
    year: Number,
    section: String,
    department: mongoose.Schema.Types.ObjectId,
    academicYear: mongoose.Schema.Types.ObjectId,
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Message content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  clicks: {
    type: Number,
    default: 0
  },

  // Delivery tracking
  deliveryStatus: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    deliveredCount: { type: Number, default: 0 },
    readCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 }
  },

  // Notification settings
  deliveryMethods: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    dashboard: { type: Boolean, default: true }
  },

  // Metadata
  category: {
    type: String,
    enum: ['announcement', 'attendance', 'assignment', 'exam', 'general'],
    default: 'general'
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
notificationSchema.index({ recipientType: 1, 'recipientFilters.year': 1, 'recipientFilters.section': 1 });
notificationSchema.index({ sender: 1, createdAt: -1 });
notificationSchema.index({ isActive: 1, expiresAt: 1 });

// Virtual for recipient count
notificationSchema.virtual('recipientCount').get(function() {
  return this.deliveryStatus.deliveredCount;
});

// Methods
notificationSchema.methods.markAsRead = function(userId) {
  // Implementation for marking as read
};

notificationSchema.methods.getRecipientList = async function() {
  // Implementation to get actual recipient users based on filters
  const User = mongoose.model('User');
  let query = { isActive: true };

  switch (this.recipientType) {
    case 'all':
      query.role = { $in: ['student', 'teacher'] };
      break;
    case 'all-students':
      query.role = 'student';
      break;
    case 'all-teachers':
      query.role = 'teacher';
      break;
    case 'year':
      query.year = this.recipientFilters.year;
      query.role = 'student';
      break;
    case 'section':
      query.year = this.recipientFilters.year;
      query.section = this.recipientFilters.section;
      query.role = 'student';
      break;
    case 'individual':
      query._id = { $in: this.recipientFilters.specificUsers };
      break;
  }

  return await User.find(query).select('_id email firstName lastName role');
};

module.exports = mongoose.model('Notification', notificationSchema); 