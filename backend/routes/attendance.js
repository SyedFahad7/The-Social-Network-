const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('section').optional().isIn(['A', 'B', 'C']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    section,
    startDate,
    endDate,
    sortBy = 'date',
    sortOrder = 'desc'
  } = req.query;

  let query = {};
  
  // Filter based on user role
  if (req.user.role === 'student') {
    query['attendanceRecords.student'] = req.user._id;
  } else if (req.user.role === 'teacher') {
    query.teacher = req.user._id;
  }
  
  if (section && req.user.role !== 'student') {
    query.section = section;
  }
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [attendanceRecords, total] = await Promise.all([
    Attendance.find(query)
      .populate('teacher', 'firstName lastName email')
      .populate('attendanceRecords.student', 'firstName lastName rollNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Attendance.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      attendanceRecords,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/attendance
// @desc    Create attendance record
// @access  Private (Teacher only)
router.post('/', [
  authenticate,
  requireTeacher,
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('section').isIn(['A', 'B', 'C']).withMessage('Valid section is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('classType').optional().isIn(['lecture', 'lab', 'tutorial']),
  body('attendanceData').isArray({ min: 1 }).withMessage('Attendance data is required'),
  body('attendanceData.*.studentId').isMongoId().withMessage('Valid student ID is required'),
  body('attendanceData.*.status').isIn(['present', 'absent', 'late']).withMessage('Valid status is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { subject, subjectCode, section, date, classType, attendanceData, duration } = req.body;

  // Check if attendance already exists for this date/section/subject
  const existingAttendance = await Attendance.findOne({
    teacher: req.user._id,
    section,
    subject,
    date: new Date(date)
  });

  if (existingAttendance) {
    return res.status(400).json({
      success: false,
      message: 'Attendance already marked for this date and section'
    });
  }

  // Verify all students belong to the section
  const studentIds = attendanceData.map(item => item.studentId);
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'student',
    section,
    department: req.user.department,
    isActive: true
  });

  if (students.length !== studentIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Some students do not belong to the specified section'
    });
  }

  // Create attendance record
  const attendanceRecord = new Attendance({
    teacher: req.user._id,
    subject,
    subjectCode,
    section,
    department: req.user.department,
    date: new Date(date),
    classType: classType || 'lecture',
    duration: duration || 60,
    attendanceRecords: attendanceData.map(item => ({
      student: item.studentId,
      status: item.status,
      remarks: item.remarks || null
    }))
  });

  await attendanceRecord.save();
  await attendanceRecord.populate('attendanceRecords.student', 'firstName lastName rollNumber');

  res.status(201).json({
    success: true,
    message: 'Attendance marked successfully',
    data: { attendanceRecord }
  });
}));

// @route   GET /api/attendance/student/:studentId/stats
// @desc    Get attendance statistics for a student
// @access  Private
router.get('/student/:studentId/stats', authenticate, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  // Check permissions
  if (req.user.role === 'student' && req.user._id.toString() !== studentId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const stats = await Attendance.getStudentAttendanceStats(studentId);
  
  res.json({
    success: true,
    data: { stats }
  });
}));

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private (Teacher only)
router.put('/:id', [
  authenticate,
  requireTeacher,
  body('attendanceData').optional().isArray(),
  body('attendanceData.*.studentId').isMongoId(),
  body('attendanceData.*.status').isIn(['present', 'absent', 'late'])
], asyncHandler(async (req, res) => {
  const attendanceRecord = await Attendance.findById(req.params.id);
  
  if (!attendanceRecord) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  // Check ownership
  if (attendanceRecord.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Check if record is finalized
  if (attendanceRecord.isFinalized) {
    return res.status(400).json({
      success: false,
      message: 'Cannot update finalized attendance record'
    });
  }

  const { attendanceData } = req.body;
  
  if (attendanceData) {
    await attendanceRecord.bulkMarkAttendance(attendanceData);
  }

  await attendanceRecord.populate('attendanceRecords.student', 'firstName lastName rollNumber');

  res.json({
    success: true,
    message: 'Attendance updated successfully',
    data: { attendanceRecord }
  });
}));

// @route   PUT /api/attendance/:id/finalize
// @desc    Finalize attendance record
// @access  Private (Teacher only)
router.put('/:id/finalize', [
  authenticate,
  requireTeacher
], asyncHandler(async (req, res) => {
  const attendanceRecord = await Attendance.findById(req.params.id);
  
  if (!attendanceRecord) {
    return res.status(404).json({
      success: false,
      message: 'Attendance record not found'
    });
  }

  // Check ownership
  if (attendanceRecord.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  attendanceRecord.isFinalized = true;
  await attendanceRecord.save();

  res.json({
    success: true,
    message: 'Attendance record finalized successfully',
    data: { attendanceRecord }
  });
}));

module.exports = router;