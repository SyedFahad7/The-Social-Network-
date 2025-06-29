const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Timetable = require('../models/Timetable');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/timetable
// @desc    Get timetable
// @access  Private
router.get('/', [
  authenticate,
  query('section').optional().isIn(['A', 'B', 'C']),
  query('academicYear').optional().matches(/^\d{4}-\d{4}$/),
  query('semester').optional().isInt({ min: 1, max: 8 })
], asyncHandler(async (req, res) => {
  const {
    section,
    academicYear = '2024-2025',
    semester = 7
  } = req.query;

  let query = {
    academicYear,
    semester: parseInt(semester),
    isActive: true
  };

  // Filter based on user role
  if (req.user.role === 'student') {
    query.section = req.user.section;
    query.department = req.user.department;
  } else if (req.user.role === 'teacher') {
    if (section) {
      query.section = section;
    } else {
      query.teacher = req.user._id;
    }
  } else {
    // Admin/Super Admin can see all
    if (section) {
      query.section = section;
    }
  }

  const timetable = await Timetable.find(query)
    .populate('teacher', 'firstName lastName email')
    .sort({ dayOfWeek: 1, startTime: 1 });

  // Group by day of week for better frontend consumption
  const groupedTimetable = timetable.reduce((acc, slot) => {
    if (!acc[slot.dayOfWeek]) {
      acc[slot.dayOfWeek] = [];
    }
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      timetable: groupedTimetable,
      academicYear,
      semester: parseInt(semester)
    }
  });
}));

// @route   POST /api/timetable
// @desc    Create timetable slot
// @access  Private (Teacher+)
router.post('/', [
  authenticate,
  requireTeacher,
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('section').isIn(['A', 'B', 'C']).withMessage('Valid section is required'),
  body('dayOfWeek').isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).withMessage('Valid day is required'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required (HH:MM)'),
  body('room').trim().notEmpty().withMessage('Room is required'),
  body('classType').optional().isIn(['lecture', 'lab', 'tutorial']),
  body('academicYear').matches(/^\d{4}-\d{4}$/).withMessage('Valid academic year is required (YYYY-YYYY)'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required (1-8)')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const {
    subject,
    subjectCode,
    section,
    dayOfWeek,
    startTime,
    endTime,
    room,
    classType,
    academicYear,
    semester
  } = req.body;

  // Check for scheduling conflicts
  const hasConflict = await Timetable.checkConflict(
    section,
    dayOfWeek,
    startTime,
    endTime,
    academicYear,
    parseInt(semester)
  );

  if (hasConflict) {
    return res.status(400).json({
      success: false,
      message: 'Time slot conflicts with existing schedule'
    });
  }

  const timetableSlot = new Timetable({
    teacher: req.user._id,
    subject,
    subjectCode,
    section,
    department: req.user.department,
    dayOfWeek,
    startTime,
    endTime,
    room,
    classType: classType || 'lecture',
    academicYear,
    semester: parseInt(semester)
  });

  await timetableSlot.save();
  await timetableSlot.populate('teacher', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Timetable slot created successfully',
    data: { timetableSlot }
  });
}));

// @route   PUT /api/timetable/:id
// @desc    Update timetable slot
// @access  Private (Teacher only)
router.put('/:id', [
  authenticate,
  requireTeacher,
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('room').optional().trim().notEmpty(),
  body('classType').optional().isIn(['lecture', 'lab', 'tutorial'])
], asyncHandler(async (req, res) => {
  const timetableSlot = await Timetable.findById(req.params.id);
  
  if (!timetableSlot) {
    return res.status(404).json({
      success: false,
      message: 'Timetable slot not found'
    });
  }

  // Check ownership
  if (timetableSlot.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const { startTime, endTime, room, classType } = req.body;

  // If time is being updated, check for conflicts
  if (startTime || endTime) {
    const newStartTime = startTime || timetableSlot.startTime;
    const newEndTime = endTime || timetableSlot.endTime;
    
    const hasConflict = await Timetable.checkConflict(
      timetableSlot.section,
      timetableSlot.dayOfWeek,
      newStartTime,
      newEndTime,
      timetableSlot.academicYear,
      timetableSlot.semester,
      timetableSlot._id
    );

    if (hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'Updated time slot conflicts with existing schedule'
      });
    }
  }

  // Update allowed fields
  const allowedUpdates = ['startTime', 'endTime', 'room', 'classType'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(timetableSlot, updates);
  await timetableSlot.save();

  res.json({
    success: true,
    message: 'Timetable slot updated successfully',
    data: { timetableSlot }
  });
}));

// @route   DELETE /api/timetable/:id
// @desc    Delete timetable slot
// @access  Private (Teacher only)
router.delete('/:id', [
  authenticate,
  requireTeacher
], asyncHandler(async (req, res) => {
  const timetableSlot = await Timetable.findById(req.params.id);
  
  if (!timetableSlot) {
    return res.status(404).json({
      success: false,
      message: 'Timetable slot not found'
    });
  }

  // Check ownership
  if (timetableSlot.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  timetableSlot.isActive = false;
  await timetableSlot.save();

  res.json({
    success: true,
    message: 'Timetable slot deleted successfully'
  });
}));

module.exports = router;