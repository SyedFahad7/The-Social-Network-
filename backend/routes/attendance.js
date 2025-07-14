const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Helper to normalize ObjectId or {$oid: ...} to string
function getIdString(id) {
  if (!id) return '';
  if (typeof id === 'object' && id !== null && id.$oid) return id.$oid;
  return id.toString();
}

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
  body('hour').optional().isInt({ min: 1, max: 12 }),
  body('hours').optional().isArray(),
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

  const { academicYear, department, year, semester, section, subject, date, students } = req.body;
  const hours = req.body.hours || (req.body.hour ? [req.body.hour] : []);
  if (!hours.length) {
    return res.status(400).json({ success: false, message: 'At least one hour must be specified.' });
  }
  const results = [];
  for (const hour of hours) {
    const studentsData = students.map(s => ({
      studentId: s.studentId,
      status: s.status === 'present' ? 'present' : 'absent',
      late: !!s.late,
      comments: s.comments || ''
    }));
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
      results.push({ hour, success: true, data: attendanceRecord });
    } catch (error) {
      results.push({ hour, success: false, error: error.message });
    }
  }
  const allSuccess = results.every(r => r.success);
  res.status(allSuccess ? 201 : 207).json({
    success: allSuccess,
    message: allSuccess ? 'Attendance saved for all hours' : 'Some hours failed',
    results
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
  body('hour').optional().isInt({ min: 1, max: 6 }),
  body('hours').optional().isArray(),
  body('students').isArray({ min: 1 }),
  body('students.*.studentId').isMongoId(),
  body('students.*.status').isIn(['present', 'late', 'absent'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { academicYear, department, year, semester, section, subject, date, students } = req.body;
  const hours = req.body.hours || (req.body.hour ? [req.body.hour] : []);
  if (!hours.length) {
    return res.status(400).json({ success: false, message: 'At least one hour must be specified.' });
  }
  const results = [];
  for (const hour of hours) {
    let record = await Attendance.findOne({ subject, date, hour, section });
    if (record) {
      record.students = students.map(s => ({ ...s, updatedAt: new Date(), updatedBy: req.user._id }));
      record.lastEditedAt = new Date();
      await record.save();
      results.push({ hour, success: true, data: record });
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
      results.push({ hour, success: true, data: record });
    }
  }
  const allSuccess = results.every(r => r.success);
  res.status(allSuccess ? 201 : 207).json({
    success: allSuccess,
    message: allSuccess ? 'Attendance marked for all hours' : 'Some hours failed',
    results
  });
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

// @route   GET /api/attendance/student/daily
// @desc    Get student's attendance for a specific date (all 6 hours)
// @access  Private (Student can only access their own data)
router.get('/student/daily', [
  authenticate,
  query('date').isISO8601().withMessage('Valid date is required')
], asyncHandler(async (req, res) => {
  const { date } = req.query;
  const studentId = req.user._id;

  // Get student's details
  const student = await User.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  // Build filter with fallback
  const filter = {
    academicYear: student.academicYear || student._doc?.academicYear || (student.get && student.get('academicYear')),
    department: student.department,
    year: student.year,
    semester: student.currentSemester,
    section: student.section,
    date: date
  };

  // Find all attendance records for the student's section on the given date
  const attendanceRecords = await Attendance.find(filter)
    .populate('subject', 'name code')
    .populate('markedBy', 'firstName lastName')
    .sort({ hour: 1 });
  console.log('[ATTENDANCE/STUDENT/DAILY] Records found:', attendanceRecords.length);

  // Create a map for all 6 hours
  const hourlyAttendance = {};
  for (let hour = 1; hour <= 6; hour++) {
    hourlyAttendance[hour] = {
      hour,
      subject: null,
      status: 'not_marked',
      markedBy: null,
      timestamp: null
    };
  }

  // Populate with actual attendance data
  attendanceRecords.forEach(record => {
    const studentRecord = record.students.find(s => 
      getIdString(s.studentId) === getIdString(studentId)
    );

    if (studentRecord) {
      hourlyAttendance[record.hour] = {
        hour: record.hour,
        subject: record.subject,
        status: studentRecord.late ? 'late' : studentRecord.status,
        markedBy: record.markedBy,
        timestamp: record.lastEditedAt,
        comments: studentRecord.comments || ''
      };
    } else {
      // Record exists but student not marked
      hourlyAttendance[record.hour] = {
        hour: record.hour,
        subject: record.subject,
        status: 'not_marked',
        markedBy: record.markedBy,
        timestamp: record.lastEditedAt
      };
    }
  });

  // Calculate summary
  const summary = {
    total: 6,
    present: 0,
    absent: 0,
    late: 0,
    not_marked: 0
  };

  Object.values(hourlyAttendance).forEach(record => {
    summary[record.status]++;
  });

  res.json({
    success: true,
    data: {
      date,
      student: {
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
        rollNumber: student.rollNumber,
        section: student.section,
        year: student.year,
        semester: student.currentSemester
      },
      summary,
      attendance: Object.values(hourlyAttendance)
    }
  });
}));

module.exports = router;