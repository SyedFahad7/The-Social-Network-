const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const stream = require('stream');
const mongoose = require('mongoose');

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
  const User = require('../models/User');
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
  const mongoose = require('mongoose');
  const User = require('../models/User');
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
    layout: 'portrait',  // Changed from landscape to portrait
    margin: { top: 30, bottom: 30, left: 5, right: 5 }
  });

  let filename = `Attendance_Summary_${section}_${year}_${academicYearLabel}_${startDate}_to_${endDate}.pdf`;
  filename = encodeURIComponent(filename);
  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');

  // Pipe PDF to response
  doc.pipe(res);

  // Title and Header Info
  doc.fontSize(16).font('Helvetica-Bold').text('Attendance Summary', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica')
    .text(`Section: ${section}   Year: ${year}   Academic Year: ${academicYearLabel}`, { align: 'center' });
  doc.text(`Date Range: ${startDate} to ${endDate}`, { align: 'center' });
  doc.moveDown(1);

  // Table headers with full subject names (no truncation)
  const tableHeaders = [
    'S. No.',
    'Student Name',
    'Roll Number',
    ...subjects.map(s => s.shortName || s.name),
    'Total',
    'Percent'
  ];

  const tableHeaderTotals = [
    '',
    '',
    '',
    ...subjects.map(s => s.totalConducted?.toString() || '0'),
    totalClasses.toString(),
    ''
  ];

  // Column widths: auto-shrink subject columns to fit page, with a minimum width
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const minSubjectColWidth = 40;
  let baseNameColWidth = 100;
  let baseRollColWidth = 60;
  let baseTotalColWidth = 40;
  let basePercentColWidth = 50;
  let baseSnoColWidth = 30;
  let subjectColWidth = 80;

  // Calculate initial widths
  let fixedColsWidth = baseSnoColWidth + baseNameColWidth + baseRollColWidth + baseTotalColWidth + basePercentColWidth;
  let availableForSubjects = pageWidth - fixedColsWidth;
  subjectColWidth = subjects.length > 0 ? availableForSubjects / subjects.length : 80;

  // If subjectColWidth is less than min, shrink name column to compensate
  if (subjectColWidth < minSubjectColWidth) {
    subjectColWidth = minSubjectColWidth;
    // Recalculate available width for name column
    const totalSubjectsWidth = subjectColWidth * subjects.length;
    let remainingWidth = pageWidth - (baseSnoColWidth + baseRollColWidth + baseTotalColWidth + basePercentColWidth + totalSubjectsWidth);
    baseNameColWidth = Math.max(60, remainingWidth); // Don't let name column go below 60
  }

  const colWidths = [
    baseSnoColWidth,    // S.No
    baseNameColWidth,   // Student Name
    baseRollColWidth,   // Roll Number
    ...subjects.map(() => subjectColWidth), // Subject columns
    baseTotalColWidth,  // Total
    basePercentColWidth // Percent
  ];

  const startX = doc.page.margins.left;
  let y = doc.y;

  // Helper to wrap text for headers
  function wrapHeaderText(text, width, fontSize, font) {
    doc.font(font).fontSize(fontSize);
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const testWidth = doc.widthOfString(testLine);
      if (testWidth > width - 4 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Function to draw table row (header supports wrapping)
  function drawTableRow(data, y, isHeader = false, isTotalRow = false) {
    let x = startX;
    let rowHeight = isHeader ? 25 : isTotalRow ? 20 : 18;
    const fontSize = isHeader ? 8 : isTotalRow ? 7 : 7;
    const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
    doc.font(font).fontSize(fontSize);

    // For header, calculate max height needed for wrapped text
    let headerLineCounts = [];
    if (isHeader) {
      for (let i = 0; i < data.length; i++) {
        const lines = wrapHeaderText(data[i], colWidths[i], fontSize, font);
        headerLineCounts[i] = lines.length;
      }
      rowHeight = Math.max(...headerLineCounts) * (fontSize + 2) + 6;
    }

    data.forEach((cell, i) => {
      const bgColor = isHeader ? '#e8e8e8' : isTotalRow ? '#f5f5f5' : '#ffffff';
      doc.rect(x, y, colWidths[i], rowHeight).fillAndStroke(bgColor, '#666666');
      doc.fillColor('#000000');
      const textY = y + 4;
      if (isHeader) {
        // Wrap header text
        const lines = wrapHeaderText(cell, colWidths[i], fontSize, font);
        lines.forEach((line, idx) => {
          doc.text(line, x + 2, textY + idx * (fontSize + 2), {
            width: colWidths[i] - 4,
            align: 'center',
            ellipsis: true
          });
        });
      } else if (i === 1) {
        // Student name column - left align
        doc.text(cell, x + 2, textY, {
          width: colWidths[i] - 4,
          align: 'left',
          ellipsis: true
        });
      } else {
        // All other columns - center align
        doc.text(cell, x + 2, textY, {
          width: colWidths[i] - 4,
          align: 'center',
          ellipsis: true
        });
      }
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
    // Check if we need a new page
    if (y > doc.page.height - 60) {
      doc.addPage({ size: 'A4', layout: 'portrait' });
      y = doc.page.margins.top;
      y = drawTableRow(tableHeaders, y, true);
      y = drawTableRow(tableHeaderTotals, y, false, true);
    }
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

module.exports = router;