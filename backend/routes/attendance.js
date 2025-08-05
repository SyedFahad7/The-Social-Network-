const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult, query } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher, requireStudent } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const stream = require('stream');

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
    .populate('subject', 'name code shortName')
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

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics for current user (student)
// @access  Private (Student only)
router.get('/stats', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can access attendance statistics'
    });
  }

  try {
    // Convert string IDs to ObjectIds for proper MongoDB querying
    const departmentId = mongoose.Types.ObjectId.isValid(req.user.department) 
      ? new mongoose.Types.ObjectId(req.user.department) 
      : req.user.department;

    // Get attendance statistics for the current student
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          'students.studentId': new mongoose.Types.ObjectId(req.user._id),
          department: departmentId,
          year: req.user.year,
          section: req.user.section
        }
      },
      {
        $unwind: '$students'
      },
      {
        $match: {
          'students.studentId': new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'present'] },
                1,
                0
              ]
            }
          },
          absent: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'absent'] },
                1,
                0
              ]
            }
          },
          late: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'late'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    let attendancePercentage = 0;
    if (attendanceStats.length > 0) {
      const stats = attendanceStats[0];
      const total = stats.total || 0;
      const present = stats.present || 0;
      attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    }

    res.json({
      success: true,
      data: {
        attendancePercentage,
        stats: attendanceStats.length > 0 ? attendanceStats[0] : {
          total: 0,
          present: 0,
          absent: 0,
          late: 0
        }
      }
    });

  } catch (error) {
    console.error('[ATTENDANCE STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics',
      error: error.message
    });
  }
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

// @route   GET /api/attendance/summary
// @desc    Get attendance summary for a section/year/academicYear and date range
// @access  Private (Teacher or Super-admin)
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const { section, year, academicYear, startDate, endDate } = req.query;
  if (!section || !year || !academicYear || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
  }
  const Subject = require('../models/Subject');
  // Force academicYear to ObjectId
  const academicYearId = new mongoose.Types.ObjectId(academicYear);
  // 1. Get all students in section/year/academicYear
  const students = await User.find({
    role: 'student',
    section,
    year: Number(year),
    academicYear: academicYearId,
    isActive: true
  }).select('_id firstName lastName rollNumber department');
  console.log('[SUMMARY] students:', students.length, students.map(s => s._id.toString()));
  // 2. Get all subjects for section/year/academicYear (by department)
  const firstStudent = students[0];
  if (!firstStudent) {
    console.log('[SUMMARY] No students found.');
    return res.json({ success: true, subjects: [], students: [], totalClasses: 0 });
  }
  const department = firstStudent.department;
  const subjects = await Subject.find({
    department,
    year: Number(year),
    academicYear: academicYearId
  }).select('_id name shortName');
  console.log('[SUMMARY] subjects:', subjects.length, subjects.map(s => s._id.toString()));
  // 3. Get all attendance records for section/year/academicYear/date range
  const Attendance = require('../models/Attendance');
  const records = await Attendance.find({
    section,
    year: Number(year),
    academicYear: academicYearId,
    date: { $gte: startDate, $lte: endDate }
  });
  console.log('[SUMMARY] attendance records:', records.length);
  // 4. Aggregate: for each subject, count total classes conducted
  const subjectTotals = {};
  subjects.forEach(subj => { subjectTotals[subj._id.toString()] = 0; });
  records.forEach(rec => {
    const subjId = rec.subject.toString();
    if (subjectTotals[subjId] !== undefined) {
      subjectTotals[subjId]++;
    }
  });
  // 5. For each student, for each subject, count attended
  const studentRows = students.map(stu => {
    const attended = {};
    let total = 0;
    subjects.forEach(subj => {
      const subjId = subj._id.toString();
      // Find all records for this subject
      const subjRecords = records.filter(r => r.subject.toString() === subjId);
      // Count presents/lates
      let attendedCount = 0;
      subjRecords.forEach(r => {
        const s = r.students.find(s2 => s2.studentId.toString() === stu._id.toString());
        if (s && (s.status === 'present' || s.late)) attendedCount++;
      });
      attended[subjId] = attendedCount;
      total += attendedCount;
    });
    // Total classes conducted for this student (sum of subjectTotals)
    const totalConducted = Object.values(subjectTotals).reduce((a, b) => a + b, 0);
    const percent = totalConducted > 0 ? (total / totalConducted) * 100 : 0;
    return {
      _id: stu._id,
      name: `${stu.firstName || ''} ${stu.lastName || ''}`.trim(),
      rollNumber: stu.rollNumber,
      attended,
      total,
      percent: Number(percent.toFixed(1))
    };
  });
  // 6. Format subjects with totalConducted
  const subjectsOut = subjects.map(subj => ({
    _id: subj._id,
    name: subj.name,
    shortName: subj.shortName,
    totalConducted: subjectTotals[subj._id.toString()] || 0
  }));
  const totalClasses = Object.values(subjectTotals).reduce((a, b) => a + b, 0);
  res.json({
    success: true,
    subjects: subjectsOut,
    students: studentRows,
    totalClasses
  });
}));

// Extract summary aggregation logic to a helper function
async function getAttendanceSummary({ section, year, academicYear, startDate, endDate }) {
  const Subject = require('../models/Subject');
  const Attendance = require('../models/Attendance');
  // Force academicYear to ObjectId
  const academicYearId = new mongoose.Types.ObjectId(academicYear);
  // 1. Get all students in section/year/academicYear
  const students = await User.find({
    role: 'student',
    section,
    year: Number(year),
    academicYear: academicYearId,
    isActive: true
  }).select('_id firstName lastName rollNumber department');
  // 2. Get all subjects for section/year/academicYear (by department)
  const firstStudent = students[0];
  if (!firstStudent) {
    return { students: [], subjects: [], totalClasses: 0 };
  }
  const department = firstStudent.department;
  const subjects = await Subject.find({
    department,
    year: Number(year),
    academicYear: academicYearId
  }).select('_id name shortName');
  // 3. Get all attendance records for section/year/academicYear/date range
  const records = await Attendance.find({
    section,
    year: Number(year),
    academicYear: academicYearId,
    date: { $gte: startDate, $lte: endDate }
  });
  // 4. Aggregate: for each subject, count total classes conducted
  const subjectTotals = {};
  subjects.forEach(subj => { subjectTotals[subj._id.toString()] = 0; });
  records.forEach(rec => {
    const subjId = rec.subject.toString();
    if (subjectTotals[subjId] !== undefined) {
      subjectTotals[subjId]++;
    }
  });
  // 5. For each student, for each subject, count attended
  const studentRows = students.map(stu => {
    const attended = {};
    let total = 0;
    subjects.forEach(subj => {
      const subjId = subj._id.toString();
      // Find all records for this subject
      const subjRecords = records.filter(r => r.subject.toString() === subjId);
      // Count presents/lates
      let attendedCount = 0;
      subjRecords.forEach(r => {
        const s = r.students.find(s2 => s2.studentId.toString() === stu._id.toString());
        if (s && (s.status === 'present' || s.late)) attendedCount++;
      });
      attended[subjId] = attendedCount;
      total += attendedCount;
    });
    // Total classes conducted for this student (sum of subjectTotals)
    const totalConducted = Object.values(subjectTotals).reduce((a, b) => a + b, 0);
    const percent = totalConducted > 0 ? (total / totalConducted) * 100 : 0;
    return {
      _id: stu._id,
      name: `${stu.firstName || ''} ${stu.lastName || ''}`.trim(),
      rollNumber: stu.rollNumber,
      attended,
      total,
      percent: Number(percent.toFixed(1))
    };
  });
  // 6. Format subjects with totalConducted
  const subjectsOut = subjects.map(subj => ({
    _id: subj._id,
    name: subj.name,
    shortName: subj.shortName,
    totalConducted: subjectTotals[subj._id.toString()] || 0
  }));
  const totalClasses = Object.values(subjectTotals).reduce((a, b) => a + b, 0);
  return { students: studentRows, subjects: subjectsOut, totalClasses };
}

// @route   GET /api/attendance/summary/pdf
// @desc    Download attendance summary as PDF for a section/year/academicYear and date range
// @access  Private (Teacher or Super-admin)
router.get('/summary/pdf', authenticate, asyncHandler(async (req, res) => {
  const { section, year, academicYear, startDate, endDate } = req.query;
  if (!section || !year || !academicYear || !startDate || !endDate) {
    return res.status(400).json({ success: false, message: 'Missing required query parameters.' });
  }
  
  const AcademicYear = require('../models/AcademicYear');
  // Fetch academic year label
  const academicYearDoc = await AcademicYear.findById(academicYear);
  const academicYearLabel = academicYearDoc?.yearLabel || academicYearDoc?.name || academicYear;
  
  // Use the same aggregation as /summary
  const { students, subjects, totalClasses } = await getAttendanceSummary({ 
    section, year, academicYear, startDate, endDate 
  });

  // --- PDFKit PDF Generation ---
  const PDFDocument = require('pdfkit');
  
  // Create PDF in A4 portrait with proper margins
  const doc = new PDFDocument({ 
    size: 'A4', 
    layout: 'portrait',
    margin: { top: 5, bottom: 5, left: 2, right: 2 }
  });

  let filename = `Attendance_Summary_${section}_${year}_${academicYearLabel}_${startDate}_to_${endDate}.pdf`;
  filename = encodeURIComponent(filename);
  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');

  // Pipe PDF to response
  doc.pipe(res);

  // Title and Header Info
  doc.fontSize(16).font('Helvetica-Bold').text('Attendance Summary', { align: 'center' });
  doc.fontSize(6)
    .text(`${section} | ${year} | ${academicYearLabel}`, { align: 'center' });
  doc.text(`${startDate} to ${endDate}`, { align: 'center' });    
  doc.moveDown(0.5);

  // Table headers with short names for single-line display
  const tableHeaders = [
    '#',
    'Name',
    'Roll',
    ...subjects.map(s => s.shortName),
    'Total',
    '%'
  ];

  const tableHeaderTotals = [
    '',
    '',
    '',
    ...subjects.map(s => s.totalConducted?.toString() || '0'),
    totalClasses.toString(),
    ''
  ];

  // Maximize use of full page width
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const usedByFixed = 20 + 80 + 20 + 18 + 18; // S.No + Name + Roll + Total + Percent
  const availableForSubjects = pageWidth - usedByFixed;
  const subjectWidth = Math.max(15, availableForSubjects / subjects.length);
  
  const colWidths = [
    20, // S.No
    80, // Name
    20, // Roll
    ...Array(subjects.length).fill(subjectWidth),
    18, // Total
    18  // Percent
  ];

  const startX = doc.page.margins.left;
  let y = doc.y;

  // Ultra-compact single-line function for single page
  function drawTableRow(data, y, isHeader = false, isTotalRow = false) {
    let x = startX;
    const rowHeight = isHeader ? 14 : 10;
    const fontSize = isHeader ? 7 : 6;
    const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(font).fontSize(fontSize);

    data.forEach((cell, i) => {
      const bgColor = isHeader ? '#e8e8e8' : isTotalRow ? '#f5f5f5' : '#ffffff';
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke(bgColor, '#666666');
      doc.fillColor('#000000');
      
      // Aggressive truncation for single line
      let displayText = String(cell || '');
      const maxChars = Math.floor(colWidths[i] / (fontSize * 0.45));
      if (displayText.length > maxChars) {
        displayText = displayText.substring(0, maxChars - 1) + '...';
      }
      
      doc.text(displayText, x + 1, y + 1, {
        width: colWidths[i] - 2,
        align: i === 1 ? 'left' : 'center',
        ellipsis: true
      });
      x += colWidths[i];
    });
    return y + rowHeight;
  }

  // Draw table headers
  y = drawTableRow(tableHeaders, y, true);
  // Draw totals row
  y = drawTableRow(tableHeaderTotals, y, false, true);

  // Draw student rows
  students.forEach((stu, idx) => {
    const row = [
      (idx + 1).toString(),
      stu.name || '',
      stu.rollNumber ? String(stu.rollNumber).slice(-3) : '',
      ...subjects.map(subj => (stu.attended[subj._id.toString()] || 0).toString()),
      stu.total.toString(),
      `${stu.percent.toFixed(1)}%`
    ];
    y = drawTableRow(row, y);
  });
  doc.end();
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

// @route   GET /api/attendance/student/weekly
// @desc    Get student's attendance for the current week (Monday to Saturday) in a single query
// @access  Private (Student can only access their own data)
router.get('/student/weekly', [
  authenticate
], asyncHandler(async (req, res) => {
  const studentId = req.user._id;

  // Get student's details
  const student = await User.findById(studentId);
  if (!student) {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  try {
    // Calculate the date of Monday in the current week
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    // Generate array of dates for Monday to Saturday
    const weekDates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }

    // Build filter for the student
    const filter = {
      academicYear: student.academicYear || student._doc?.academicYear || (student.get && student.get('academicYear')),
      department: student.department,
      year: student.year,
      semester: student.currentSemester,
      section: student.section,
      date: { $in: weekDates }
    };

    // Find all attendance records for the student's section for the entire week
    const attendanceRecords = await Attendance.find(filter)
      .populate('subject', 'name code')
      .populate('markedBy', 'firstName lastName')
      .sort({ date: 1, hour: 1 });

    // Create a map for all 6 days with 6 hours each
    const weeklyAttendance = {};
    weekDates.forEach(date => {
      weeklyAttendance[date] = {};
      for (let hour = 1; hour <= 6; hour++) {
        weeklyAttendance[date][hour] = {
          hour,
          subject: null,
          status: 'not_marked',
          markedBy: null,
          timestamp: null
        };
      }
    });

    // Populate with actual attendance data
    attendanceRecords.forEach(record => {
      const studentRecord = record.students.find(s => 
        getIdString(s.studentId) === getIdString(studentId)
      );

      if (studentRecord) {
        weeklyAttendance[record.date][record.hour] = {
          hour: record.hour,
          subject: record.subject,
          status: studentRecord.late ? 'late' : studentRecord.status,
          markedBy: record.markedBy,
          timestamp: record.lastEditedAt,
          comments: studentRecord.comments || ''
        };
      } else {
        // Record exists but student not marked
        weeklyAttendance[record.date][record.hour] = {
          hour: record.hour,
          subject: record.subject,
          status: 'not_marked',
          markedBy: record.markedBy,
          timestamp: record.lastEditedAt
        };
      }
    });

    // Calculate summary for each day
    const dailySummaries = {};
    weekDates.forEach(date => {
      const dayData = weeklyAttendance[date];
      const summary = {
        total: 6,
        present: 0,
        absent: 0,
        late: 0,
        not_marked: 0
      };

      Object.values(dayData).forEach(record => {
        summary[record.status]++;
      });

      dailySummaries[date] = summary;
    });

    // Format response for frontend
    const formattedData = weekDates.map(date => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      const summary = dailySummaries[date];
      
      return {
        date: dayName,
        present: summary.present,
        absent: summary.absent,
        late: summary.late,
        not_marked: summary.not_marked
      };
    });

    res.json({
      success: true,
      data: {
        weekDates,
        student: {
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
          rollNumber: student.rollNumber,
          section: student.section,
          year: student.year,
          semester: student.currentSemester
        },
        dailySummaries,
        weeklyData: formattedData,
        detailedAttendance: weeklyAttendance
      }
    });

  } catch (error) {
    console.error('[ATTENDANCE/STUDENT/WEEKLY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly attendance',
      error: error.message
    });
  }
}));

// @route   GET /api/attendance/overview
// @desc    Get attendance overview for today (present, absent, late counts)
// @access  Private (Super Admin only)
router.get('/overview', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const Attendance = require('../models/Attendance');
  const records = await Attendance.find({ date: todayStr });
  let present = 0, absent = 0, late = 0;
  for (const rec of records) {
    for (const stu of rec.students) {
      if (stu.status === 'present') present++;
      else if (stu.status === 'absent') absent++;
      else if (stu.status === 'late') late++;
    }
  }
  res.json({ success: true, data: { date: todayStr, present, absent, late } });
}));

// @route   GET /api/attendance/super-admin/overview
// @desc    Get attendance statistics for super admin dashboard for all time
// @access  Private (Super Admin only)
router.get('/super-admin/overview', authenticate, asyncHandler(async (req, res) => {
  console.log('super-admin/overview route was called');
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalAttendanceRecords = await Attendance.countDocuments({ date: today });

    // Fetch total number of students
    const totalStudents = await User.countDocuments({ role: 'student' });

    // Aggregate attendance data
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          date: today
        }
      },
      {
        $unwind: '$students'
      },
      {
        $group: {
          _id: null,
          totalPresent: { $sum: { $cond: [{ $eq: ['$students.status', 'present'], then: 1, else: 0 }] } },
          totalAbsent: { $sum: { $cond: [{ $eq: ['$students.status', 'absent'], then: 1, else: 0 }] } },
          totalLate: { $sum: { $cond: [{ $eq: ['$students.status', 'late'], then: 1, else: 0 }] } }
        }
      }
    ]);

    const summary = attendanceSummary[0] || {
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0
    };

    console.log('super-admin/overview data being sent', {
      totalAttendanceRecords,
      totalStudents,
      totalPresent: summary.totalPresent || 0,
      totalAbsent: summary.totalAbsent || 0,
      totalLate: summary.totalLate || 0,
      date: today
    });
    

    res.json({
      success: true,
      data: {
        totalAttendanceRecords,
        totalStudents,
        totalPresent: summary.totalPresent || 0,
        totalAbsent: summary.totalAbsent || 0,
        totalLate: summary.totalLate || 0,
        date: today
      }
    });
  } catch (error) {
    console.error('Error fetching super admin attendance overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance overview',
      error: error.message,
    });
  }
}));

// @route   GET /api/attendance/student/streak
// @desc    Get student's study streak
// @access  Private (Student)
router.get('/student/streak', [
  authenticate,
  requireStudent
], asyncHandler(async (req, res) => {
  const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
  
  try {
    const streak = await DailyAttendanceSummary.calculateStudyStreak(req.user._id);
    
    res.json({
      success: true,
      data: {
        streak,
        studentId: req.user._id
      }
    });
  } catch (error) {
    console.error('Error calculating study streak:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate study streak'
    });
  }
}));

// @route   GET /api/attendance/student/daily-summary
// @desc    Get student's daily attendance summary
// @access  Private (Student)
router.get('/student/daily-summary', [
  authenticate,
  requireStudent,
  query('date').optional().isISO8601().withMessage('Valid date is required')
], asyncHandler(async (req, res) => {
  const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const date = req.query.date || new Date().toISOString().split('T')[0];
  
  try {
    const summary = await DailyAttendanceSummary.calculateDailyAttendance(req.user._id, date);
    
    res.json({
      success: true,
      data: {
        summary,
        date
      }
    });
  } catch (error) {
    console.error('Error getting daily summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily summary'
    });
  }
}));

// @route   GET /api/attendance/student/stats
// @desc    Get student's attendance statistics
// @access  Private (Student)
router.get('/student/stats', [
  authenticate,
  requireStudent,
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], asyncHandler(async (req, res) => {
  const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const days = parseInt(req.query.days) || 30;
  
  try {
    const stats = await DailyAttendanceSummary.getAttendanceStats(req.user._id, days);
    const streak = await DailyAttendanceSummary.calculateStudyStreak(req.user._id);
    
    res.json({
      success: true,
      data: {
        ...stats,
        currentStreak: streak
      }
    });
  } catch (error) {
    console.error('Error getting attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get attendance statistics'
    });
  }
}));

// @route   POST /api/attendance/student/recalculate
// @desc    Recalculate attendance for a specific date range
// @access  Private (Student)
router.post('/student/recalculate', [
  authenticate,
  requireStudent,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required')
], asyncHandler(async (req, res) => {
  const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { startDate, endDate } = req.body;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const summaries = [];
    
    // Recalculate for each day in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const summary = await DailyAttendanceSummary.calculateDailyAttendance(req.user._id, dateStr);
      summaries.push(summary);
    }
    
    // Recalculate overall streak
    const streak = await DailyAttendanceSummary.calculateStudyStreak(req.user._id);
    
    res.json({
      success: true,
      data: {
        summaries,
        currentStreak: streak,
        message: `Recalculated attendance for ${summaries.length} days`
      }
    });
  } catch (error) {
    console.error('Error recalculating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate attendance'
    });
  }
}));

module.exports = router;