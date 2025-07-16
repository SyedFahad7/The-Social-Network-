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
const puppeteer = require('puppeteer');

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
  const { students, subjects, totalClasses } = await getAttendanceSummary({ section, year, academicYear, startDate, endDate });

  // --- HTML Table Generation ---
  const tableHeaders = ['S. No.', 'Student Name', 'Roll Number', ...subjects.map(s => s.shortName || s.name), 'Total', 'Percent'];
  const tableHeaderTotals = ['', '', '', ...subjects.map(s => s.totalConducted?.toString() || '0'), totalClasses, ''];
  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Attendance Summary</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 9px; margin: 24px; }
      h1 { text-align: center; font-size: 20px; margin-bottom: 8px; }
      .meta { margin-bottom: 12px; text-align: left; font-size: 11px; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th, td { border: 1px solid #888; padding: 2px 4px; text-align: center; font-size: 8px; word-break: break-all; }
      th { background: #f0f0f0; font-weight: bold; }
      tr:nth-child(even) { background: #fafbfc; }
      .left { text-align: left; }
      .right { text-align: right; }
    </style>
  </head>
  <body>
    <h1>Attendance Summary</h1>
    <div class="meta">
      <div>Section: <b>${section}</b> | Year: <b>${year}</b> | Academic Year: <b>${academicYearLabel}</b></div>
      <div>Date Range: <b>${startDate}</b> to <b>${endDate}</b></div>
    </div>
    <table>
      <thead>
        <tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
        <tr>${tableHeaderTotals.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${students.map((stu, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td class="left">${stu.name}</td>
            <td>${stu.rollNumber ? String(stu.rollNumber).slice(-3) : ''}</td>
            ${subjects.map(subj => `<td>${stu.attended[subj._id.toString()] || 0}</td>`).join('')}
            <td>${stu.total}</td>
            <td>${stu.percent.toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </body>
  </html>
  `;

  // --- Puppeteer PDF Generation ---
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 }
  });
  await browser.close();

  let filename = `Attendance_Summary_${section}_${year}_${academicYearLabel}_${startDate}_to_${endDate}.pdf`;
  filename = encodeURIComponent(filename);
  res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-type', 'application/pdf');
  res.send(pdfBuffer);
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