const express = require('express');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ClassReminderService = require('../services/classReminderService');
const ClassReminder = require('../models/ClassReminder');

const router = express.Router();

// GET /api/class-reminders/status - Get system status
router.get('/status', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const totalReminders = await ClassReminder.countDocuments();
  const pendingReminders = await ClassReminder.countDocuments({ notificationSent: false });
  const sentReminders = await ClassReminder.countDocuments({ notificationSent: true });
  
  res.json({
    success: true,
    data: {
      totalReminders,
      pendingReminders,
      sentReminders,
      systemStatus: 'active'
    }
  });
}));

// POST /api/class-reminders/generate - Manually generate reminders for all students
router.post('/generate', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ClassReminderService.generateRemindersForAllStudents();
  
  res.json({
    success: true,
    message: 'Class reminders generated successfully'
  });
}));

// POST /api/class-reminders/send - Manually send pending notifications
router.post('/send', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ClassReminderService.sendUpcomingClassNotifications();
  
  res.json({
    success: true,
    message: 'Pending notifications sent successfully'
  });
}));

// POST /api/class-reminders/cleanup - Manually cleanup old reminders
router.post('/cleanup', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ClassReminderService.cleanupOldReminders();
  
  res.json({
    success: true,
    message: 'Old reminders cleaned up successfully'
  });
}));

// GET /api/class-reminders/student/:studentId - Get reminders for a specific student
router.get('/student/:studentId', authenticate, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  // Check if user is requesting their own reminders or is super admin
  if (req.user.role !== 'super-admin' && req.user._id.toString() !== studentId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }
  
  const reminders = await ClassReminder.find({ 
    studentId,
    classTime: { $gte: new Date() }
  })
  .populate('subjectId', 'name code')
  .sort({ classTime: 1 })
  .limit(10);
  
  res.json({
    success: true,
    data: reminders
  });
}));

// DELETE /api/class-reminders/student/:studentId - Clear reminders for a student
router.delete('/student/:studentId', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  await ClassReminder.deleteMany({ studentId });
  
  res.json({
    success: true,
    message: 'Reminders cleared for student'
  });
}));

module.exports = router; 