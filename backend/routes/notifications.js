const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher, requireSuperAdmin } = require('../middleware/auth');
const { client: redisClient, connectRedis } = require('../lib/redisClient');
const { sendPushNotification, sendPushNotificationToMultiple } = require('../lib/firebase');
const mongoose = require('mongoose');
const { unknown } = require('zod');

const router = express.Router();

// Helper function to get FCM tokens for users
async function getFCMTokensForUsers(userIds) {
  const users = await User.find({ 
    _id: { $in: userIds },
    fcmToken: { $exists: true, $ne: null },
    pushNotificationsEnabled: true
  }).select('fcmToken');
  
  return users.map(user => user.fcmToken).filter(token => token);
}

// Helper function to send push notifications
async function sendPushNotifications(userIds, notification) {
  try {
    const fcmTokens = await getFCMTokensForUsers(userIds);
    
    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found for users:', userIds);
      return { successCount: 0, failureCount: 0 };
    }

    // Convert all data values to strings for Firebase FCM
    const stringifiedMetadata = {};
    if (notification.metadata) {
      Object.keys(notification.metadata).forEach(key => {
        const value = notification.metadata[key];
        stringifiedMetadata[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      });
    }

    // Fetch sender details from DB if needed
    let senderName = '';
    let senderRole = '';
    if (notification.sender) {
      // If notification.sender is a populated object
      if (typeof notification.sender === 'object' && notification.sender.firstName) {
        senderName = `${notification.sender.firstName} ${notification.sender.lastName || ''}`.trim();
        senderRole = notification.sender.role || '';
      } else {
        // If not populated, fetch from DB
        const senderUser = await User.findById(notification.sender).select('firstName lastName role');
        if (senderUser) {
          senderName = `${senderUser.firstName} ${senderUser.lastName || ''}`.trim();
          senderRole = senderUser.role || '';
        }
      }
    }

    const response = await sendPushNotificationToMultiple(fcmTokens, {
      title: notification.title,
      body: notification.message,
      message: notification.message,
      type: 'notification',
      notificationId: notification._id.toString(),
      data: {
        senderId: notification.sender.toString(),
        senderName,
        senderRole,
        targetType: notification.targetType || '',
        ...stringifiedMetadata
      }
    });

    return response;
  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { successCount: 0, failureCount: 1 };
  }
}

// @route   POST /api/notifications
// @desc    Send notification
// @access  Private (Teacher/Super Admin)
router.post('/', [
  authenticate,
  requireTeacher,
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('targetType').isIn(['all_students', 'all_teachers', 'specific_year', 'specific_section', 'specific_users', 'hod']).withMessage('Invalid target type'),
  body('targetValue').custom((value, { req }) => {
    // Allow empty targetValue for all_students and all_teachers
    if (req.body.targetType === 'all_students' || req.body.targetType === 'all_teachers') {
      return true;
    }
    // Allow 'hod' as a valid targetValue for hod targetType
    if (req.body.targetType === 'hod' && value === 'hod') {
      return true;
    }
    // Require targetValue for other types
    if (!value || value.trim() === '') {
      throw new Error('Target value is required');
    }
    return true;
  }),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { title, message, targetType, targetValue, priority = 'normal', metadata = {} } = req.body;

  // Determine target users based on targetType and targetValue
  let targetUsers = [];
  
  switch (targetType) {
    case 'all_students':
      targetUsers = await User.find({ role: 'student', isActive: true }).select('_id');
      break;
      
    case 'all_teachers':
      targetUsers = await User.find({ role: 'teacher', isActive: true }).select('_id');
      break;
      
    case 'hod':
      targetUsers = await User.find({ role: 'super-admin', isActive: true }).select('_id');
      break;
      
    case 'specific_year':
      targetUsers = await User.find({ 
        role: 'student', 
        year: parseInt(targetValue), 
        isActive: true 
      }).select('_id');
      break;
      
    case 'specific_section':
      const [year, section, academicYear] = targetValue.split('-');
      targetUsers = await User.find({ 
        role: 'student', 
        year: parseInt(year), 
        section, 
        academicYear: new mongoose.Types.ObjectId(academicYear),
        isActive: true 
      }).select('_id');
      break;
      
    case 'specific_users':
      targetUsers = await User.find({ 
        _id: { $in: targetValue.split(',') }, 
        isActive: true 
      }).select('_id');
      break;
  }

  if (targetUsers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No target users found'
    });
  }

  // Create notification
  const notification = await Notification.create({
    sender: req.user._id,
    senderRole: req.user.role,
    title,
    message,
    priority,
    recipientType: targetType === 'all_students' ? 'all-students' : 
                   targetType === 'all_teachers' ? 'all-teachers' : 
                   targetType === 'specific_year' ? 'year' : 
                   targetType === 'specific_section' ? 'section' : 
                   targetType === 'hod' ? 'hod' : 'individual',
    recipientFilters: targetType === 'specific_year' ? { year: parseInt(targetValue) } :
                      targetType === 'specific_section' ? (() => {
                        const [year, section, academicYear] = targetValue.split('-');
                        return { year: parseInt(year), section, academicYear };
                      })() :
                      targetType === 'specific_users' ? { specificUsers: targetValue.split(',') } :
                      targetType === 'hod' ? {} : {},
    deliveryStatus: {
      sent: true,
      sentAt: new Date(),
      deliveredCount: targetUsers.length
    },
    deliveryMethods: {
      push: metadata?.enablePush !== false,
      dashboard: true
    },
    category: metadata?.category || 'general'
  });

  // Create user notifications
  const userNotifications = targetUsers.map(user => ({
    user: user._id,
    notification: notification._id,
    delivered: true,
    deliveredAt: new Date()
  }));

  await UserNotification.insertMany(userNotifications);

  // Send push notifications
  const pushResult = await sendPushNotifications(
    targetUsers.map(u => u._id),
    notification
  );

  // Publish to Redis for real-time updates
  await connectRedis();
  await redisClient.publish('notifications', JSON.stringify({
    type: 'new_notification',
    notification: {
      _id: notification._id,
      title,
      message,
      senderName: `${req.user.firstName} ${req.user.lastName}`,
      senderRole: req.user.role,
      createdAt: notification.createdAt
    },
    recipientCount: targetUsers.length
  }));

  res.status(201).json({
    success: true,
    message: 'Notification sent successfully',
    data: {
      notification: {
        ...notification.toObject(),
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        senderRole: `${req.user.role}`,
        totalRecipients: targetUsers.length,
        targetType,
        targetValue
      },
      recipientCount: targetUsers.length,
      pushNotifications: pushResult
    }
  });
}));

// @route   POST /api/notifications/fcm-token
// @desc    Update user's FCM token
// @access  Private
router.post('/fcm-token', [
  authenticate,
  body('fcmToken').notEmpty().withMessage('FCM token is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { fcmToken } = req.body;

  // Update user's FCM token
  await User.findByIdAndUpdate(req.user._id, {
    fcmToken,
    pushNotificationsEnabled: true
  });

  res.json({
    success: true,
    message: 'FCM token updated successfully'
  });
}));

// @route   PUT /api/notifications/push-settings
// @desc    Update push notification settings
// @access  Private
router.put('/push-settings', [
  authenticate,
  body('enabled').isBoolean().withMessage('Enabled must be a boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { enabled } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    pushNotificationsEnabled: enabled
  });

  res.json({
    success: true,
    message: `Push notifications ${enabled ? 'enabled' : 'disabled'} successfully`
  });
}));

// @route   GET /api/notifications
// @desc    Get notifications for current user
// @access  Private
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('read').optional().isBoolean(),
  query('category').optional().isIn(['announcement', 'attendance', 'assignment', 'exam', 'general'])
], asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, read, category } = req.query;
  const skip = (page - 1) * limit;

  // Build query
  const query = { user: req.user._id };
  if (read !== undefined) query.read = read;
  if (category) query['notification.category'] = category;

  const userNotifications = await UserNotification.find(query)
    .populate({
      path: 'notification',
      populate: {
        path: 'sender',
        select: 'firstName lastName role'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await UserNotification.countDocuments(query);

  // Format response
  const notifications = userNotifications.map(un => ({
    _id: un.notification._id,
    title: un.notification.title,
    message: un.notification.message,
    sender: un.notification.sender,
    senderRole: un.notification.sender ? un.notification.sender.role : 'unknown',
    senderName: un.notification.sender ? `${un.notification.sender.firstName} ${un.notification.sender.lastName}` : 'Unknown',
    priority: un.notification.priority,
    category: un.notification.category,
    read: un.read,
    readAt: un.readAt,
    delivered: un.delivered,
    deliveredAt: un.deliveredAt,
    createdAt: un.notification.createdAt,
    isRead: un.read // Add this for frontend compatibility
  }));

  res.json({
    success: true,
    data: {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticate, asyncHandler(async (req, res) => {
  const count = await UserNotification.countDocuments({
    user: req.user._id,
    read: false
  });

  res.json({
    success: true,
    data: { count }
  });
}));

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userNotification = await UserNotification.findOneAndUpdate(
    {
      user: req.user._id,
      notification: id
    },
    {
      read: true,
      readAt: new Date()
    },
    { new: true }
  );

  if (!userNotification) {
    return res.status(404).json({
      success: false,
      message: 'Notification not found'
    });
  }

  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticate, asyncHandler(async (req, res) => {
  await UserNotification.updateMany(
    {
      user: req.user._id,
      read: false
    },
    {
      read: true,
      readAt: new Date()
    }
  );

  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// @route   GET /api/notifications/sent
// @desc    Get notifications sent by current user (Super-admin/Teacher)
// @access  Private
router.get('/sent', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], asyncHandler(async (req, res) => {
  if (req.user.role === 'student') {
    return res.status(403).json({
      success: false,
      message: 'Students cannot view sent notifications'
    });
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ sender: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments({ sender: req.user._id });

  // Format notifications to include expected fields
  const formattedNotifications = notifications.map(notification => ({
    ...notification.toObject(),
    senderName: `${req.user.firstName} ${req.user.lastName} ${req.user.role}`,
    totalRecipients: notification.deliveryStatus?.deliveredCount || 0,
    targetType: notification.recipientType === 'all-students' ? 'all_students' :
                notification.recipientType === 'all-teachers' ? 'all_teachers' :
                notification.recipientType === 'year' ? 'specific_year' :
                notification.recipientType === 'section' ? 'specific_section' : 'specific_users',
    targetValue: notification.recipientType === 'year' ? notification.recipientFilters?.year?.toString() :
                 notification.recipientType === 'section' ? `${notification.recipientFilters?.year}-${notification.recipientFilters?.section}-${notification.recipientFilters?.academicYear}` :
                 notification.recipientType === 'individual' ? notification.recipientFilters?.specificUsers?.join(',') : 'all'
  }));

  res.json({
    success: true,
    data: {
      notifications: formattedNotifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
}));

// @route   GET /api/notifications/stats
// @desc    Get notification statistics (Super-admin only)
// @access  Private
router.get('/stats', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const stats = await Notification.aggregate([
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalDelivered: { $sum: '$deliveryStatus.deliveredCount' },
        totalRead: { $sum: '$deliveryStatus.readCount' },
        avgDeliveryRate: { $avg: { $divide: ['$deliveryStatus.deliveredCount', '$deliveryStatus.deliveredCount'] } }
      }
    }
  ]);

  const recentStats = await Notification.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      overall: stats[0] || { totalSent: 0, totalDelivered: 0, totalRead: 0, avgDeliveryRate: 0 },
      recent: recentStats
    }
  });
}));

// Track notification click
router.post('/track-click', asyncHandler(async (req, res) => {
  const { notificationId } = req.body;
  if (!notificationId) {
    return res.status(400).json({ success: false, message: 'notificationId is required' });
  }
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  notification.clicks = (notification.clicks || 0) + 1;
  await notification.save();
  res.json({ success: true });
}));

module.exports = router;