const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/attendance
// @desc    Get attendance records
// @access  Private
router.get('/', [
  authenticate,
  query('studentId').optional().isMongoId(),
  query('subjectId').optional().isMongoId(),
  query('date').optional().isISO8601(),
  query('hour').optional().isInt({ min: 1, max: 6 }),
  query('academicYear').optional().isString(),
  query('semester').optional().isInt(),
  query('section').optional().isString(),
  query('department').optional().isMongoId(),
  query('year').optional().isInt(),
], asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.studentId) filters['students.studentId'] = req.query.studentId;
  if (req.query.subjectId) filters.subject = req.query.subjectId;
  if (req.query.date) filters.date = req.query.date;
  if (req.query.hour) filters.hour = parseInt(req.query.hour);
  if (req.query.academicYear) filters.academicYear = req.query.academicYear;
  if (req.query.semester) filters.semester = parseInt(req.query.semester);
  if (req.query.section) filters.section = req.query.section;
  if (req.query.department) filters.department = req.query.department;
  if (req.query.year) filters.year = parseInt(req.query.year);

  const records = await Attendance.find(filters)
      .populate('markedBy', 'firstName lastName email')
    .populate('subject', 'name code')
    .populate('students.studentId', 'firstName lastName rollNumber');
  res.json({ success: true, data: records });
}));

// @route   POST /api/attendance
// @desc    Create or update attendance record (per hour, per section, per day)
// @access  Private (Teacher only)
router.post('/', [
  authenticate,
  requireTeacher,
  body('academicYear').isMongoId().withMessage('Academic year is required'),
  body('department').isMongoId().withMessage('Department is required'),
  body('year').isInt({ min: 2, max: 4 }).withMessage('Year must be 2, 3, or 4'),
  body('semester').isInt().withMessage('Semester is required'),
  body('section').isString().withMessage('Section is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('hour').isInt({ min: 1, max: 12 }).withMessage('Hour is required'),
  body('students').isArray({ min: 1 }).withMessage('Students array is required'),
  body('students.*.studentId').isMongoId().withMessage('Valid student ID is required'),
  body('students.*.status').isIn(['present', 'absent', 'late']).withMessage('Valid status is required'),
  body('students.*.comments').optional().isString(),
  body('subject').isMongoId().withMessage('Subject is required'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { academicYear, department, year, semester, section, subject, date, hour, students } = req.body;

  // In POST/PUT, build students array as:
  // { studentId, status: 'present' | 'absent', late: boolean, comments }
  const studentsData = students.map(s => ({
    studentId: s.studentId,
    status: s.status === 'present' ? 'present' : 'absent',
    late: !!s.late,
    comments: s.comments || ''
  }));
  // Use studentsData in $set
  const update = {
    $set: {
      students: studentsData,
      lastEditedAt: new Date()
    },
    $setOnInsert: {
      createdAt: new Date(),
      markedBy: req.user._id,
      subject
    }
  };

  const filter = {
    academicYear,
    department,
    year,
    semester,
    section,
    subject,
    date,
    hour
  };

  const options = { new: true, upsert: true };

  try {
    const attendanceRecord = await Attendance.findOneAndUpdate(filter, update, options)
      .populate('markedBy', 'firstName lastName email')
      .populate('students.studentId', 'firstName lastName rollNumber');

    res.status(201).json({
      success: true,
      message: 'Attendance saved',
      data: attendanceRecord
    });
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error - try to find existing record and update it
      console.log('[ATTENDANCE] Duplicate key error, trying to find existing record');
      const existingRecord = await Attendance.findOne(filter);
      if (existingRecord) {
        existingRecord.students = studentsData;
        existingRecord.lastEditedAt = new Date();
        await existingRecord.save();
        
        const updatedRecord = await Attendance.findById(existingRecord._id)
          .populate('markedBy', 'firstName lastName email')
          .populate('students.studentId', 'firstName lastName rollNumber');
        
        res.status(200).json({
          success: true,
          message: 'Attendance updated',
          data: updatedRecord
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to save attendance due to duplicate constraint'
        });
      }
    } else {
      throw error;
    }
  }
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
  body('students').isArray({ min: 1 }),
  body('students.*.studentId').isMongoId(),
  body('students.*.status').isIn(['present', 'late', 'absent'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { students } = req.body;
  const record = await Attendance.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });
  // In PUT (updateAttendance), also expect and save the new structure
  const studentsData = students.map(s => ({
    studentId: s.studentId,
    status: s.status === 'present' ? 'present' : 'absent',
    late: !!s.late,
    comments: s.comments || ''
  }));
  record.students = studentsData.map(s => ({ ...s, updatedAt: new Date(), updatedBy: req.user._id }));
  record.lastEditedAt = new Date();
  await record.save();
  res.json({ success: true, message: 'Attendance updated', data: record });
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

// POST /api/attendance/mark - mark or update attendance for a subject/date/hour/section
router.post('/mark', [
  authenticate,
  requireTeacher,
  body('academicYear').notEmpty(),
  body('department').notEmpty(),
  body('year').isInt(),
  body('semester').isInt(),
  body('section').notEmpty(),
  body('subject').notEmpty(),
  body('date').isISO8601(),
  body('hour').isInt({ min: 1, max: 6 }),
  body('students').isArray({ min: 1 }),
  body('students.*.studentId').isMongoId(),
  body('students.*.status').isIn(['present', 'late', 'absent'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { academicYear, department, year, semester, section, subject, date, hour, students } = req.body;
  let record = await Attendance.findOne({ subject, date, hour, section });
  if (record) {
    record.students = students.map(s => ({ ...s, updatedAt: new Date(), updatedBy: req.user._id }));
    record.lastEditedAt = new Date();
    await record.save();
    return res.json({ success: true, message: 'Attendance updated', data: record });
  } else {
    record = await Attendance.create({
      academicYear,
      department,
      year,
      semester,
      section,
      subject,
      date,
      hour,
      teacher: req.user._id,
      students: students.map(s => ({ ...s, updatedAt: new Date(), updatedBy: req.user._id })),
      createdAt: new Date(),
      lastEditedAt: new Date()
    });
    return res.status(201).json({ success: true, message: 'Attendance marked', data: record });
  }
}));

// GET /api/attendance/analytics/student/:studentId
router.get('/analytics/student/:studentId', authenticate, asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const records = await Attendance.find({ 'students.studentId': studentId })
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName');
  // Aggregate analytics
  const analytics = {};
  for (const rec of records) {
    const subj = rec.subject._id.toString();
    if (!analytics[subj]) analytics[subj] = { subject: rec.subject, total: 0, present: 0, late: 0 };
    analytics[subj].total++;
    const stu = rec.students.find(s => s.studentId.toString() === studentId);
    if (stu) {
      if (stu.status === 'present') analytics[subj].present++;
      if (stu.status === 'late') analytics[subj].late++;
    }
  }
  res.json({ success: true, data: analytics });
}));

module.exports = router;