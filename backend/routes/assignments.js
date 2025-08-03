const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../lib/cloudinary');

const router = express.Router();

// Cloudinary storage for assignments
const assignmentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: 'assignments',
      resource_type: 'raw', // Changed from 'auto' to 'raw' for documents
      allowed_formats: ['pdf', 'doc', 'docx'],
    };
  },
});
const uploadAssignment = multer({ 
  storage: assignmentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC files are allowed'), false);
    }
  }
});

// @route   GET /api/assignments/check-number
// @desc    Check if assignment number exists for given criteria
// @access  Private (Teacher)
router.get('/check-number', [
  authenticate,
  requireTeacher,
  query('subject').isMongoId().withMessage('Valid subject is required'),
  query('sections').notEmpty().withMessage('Sections are required'),
  query('year').isInt({ min: 2, max: 4 }).withMessage('Valid year is required'),
  query('semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  query('academicYear').isMongoId().withMessage('Valid academic year is required'),
  query('assignmentNumber').isInt({ min: 1, max: 3 }).withMessage('Valid assignment number is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { subject, sections, year, semester, academicYear, assignmentNumber } = req.query;

  // Handle sections parameter - it might be a string or array
  let sectionsArray;
  if (Array.isArray(sections)) {
    sectionsArray = sections;
  } else {
    try {
      sectionsArray = JSON.parse(sections);
    } catch (error) {
      sectionsArray = [sections];
    }
  }

  const existingAssignment = await Assignment.checkAssignmentNumber({
    subject,
    sections: sectionsArray,
    year: parseInt(year),
    semester: parseInt(semester),
    academicYear,
    assignmentNumber: parseInt(assignmentNumber)
  });

  res.json({
    success: true,
    data: {
      exists: !!existingAssignment,
      assignment: existingAssignment
    }
  });
}));

// @route   GET /api/assignments/filtered
// @desc    Get assignments with filters (for teacher dashboard)
// @access  Private (Teacher)
router.get('/filtered', [
  authenticate,
  requireTeacher,
  query('academicYear').optional().isMongoId(),
  query('year').optional().isInt({ min: 2, max: 4 }),
  query('semester').optional().isInt({ min: 1, max: 8 }),
  query('section').optional().isIn(['A', 'B', 'C']),
  query('subject').optional().isMongoId().withMessage('Valid subject is required'),
  query('type').optional().isIn(['assignment', 'test']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['createdAt', 'dueDate', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { academicYear, year, semester, section, subject, type, page = '1', limit = '10', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  let query = { isActive: true };
  
  // Filter based on user role
  if (req.user.role === 'student') {
    query.sections = { $in: [req.user.section] };
    query.department = req.user.department;
  } else if (req.user.role === 'teacher') {
    query.teacher = req.user._id;
  }
  
  if (type) query.type = type;
  if (section && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'super-admin')) {
    query.sections = { $in: [section] };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [assignments, total] = await Promise.all([
    Assignment.find(query)
      .populate('teacher', 'firstName lastName email')
      .populate('academicYear', 'name')
      .populate('subject', 'name code') // Populate subject field
      .populate('submissions.student', 'firstName lastName rollNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Assignment.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      assignments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalAssignments: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   GET /api/assignments/student
// @desc    Get assignments for student (filtered by their section, year, semester, academic year)
// @access  Private (Student)
router.get('/student', [
  authenticate
], asyncHandler(async (req, res) => {
  // Check if user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Students only.'
    });
  }

  console.log('Student assignments request - User info:', {
    role: req.user.role,
    section: req.user.section,
    year: req.user.year,
    currentSemester: req.user.currentSemester,
    academicYear: req.user.academicYear,
    semesterHistory: req.user.semesterHistory,
    department: req.user.department,
    departmentType: typeof req.user.department
  });

  // Try to get academic year from direct field first, then from semester history
  let currentAcademicYear = req.user.academicYear;

  if (!currentAcademicYear) {
    // Get current academic year from semester history
    const currentSemesterEntry = req.user.semesterHistory?.find(entry => 
      entry.semester === req.user.currentSemester && 
      entry.year === req.user.year && 
      entry.section === req.user.section
    );
    currentAcademicYear = currentSemesterEntry?.academicYear;
  }

  console.log('Current academic year:', currentAcademicYear);

  // Build query based on student's information
  const query = {
    isActive: true,
    department: req.user.department.toString(), // Add department filter
    sections: { $in: [req.user.section] },
    year: req.user.year,
    semester: req.user.currentSemester
  };

  // Add academic year if found in semester history
  if (currentAcademicYear) {
    query.academicYear = currentAcademicYear;
    console.log('Added academic year to query:', currentAcademicYear);
  } else {
    console.log('WARNING: Could not find academic year in semester history!');
    console.log('Available semester history entries:', req.user.semesterHistory);
  }

  console.log('Student assignments query:', JSON.stringify(query, null, 2));
  console.log('Department filter:', {
    userDepartment: req.user.department,
    userDepartmentType: typeof req.user.department,
    queryDepartment: query.department,
    queryDepartmentType: typeof query.department
  });

  const assignments = await Assignment.find(query)
    .populate('teacher', 'firstName lastName email')
    .populate('academicYear', 'name')
    .populate('subject', 'name code')
    .sort({ dueDate: 1 }) // Sort by due date (earliest first)
    .exec();

  console.log('Found assignments count:', assignments.length);
  console.log('Assignments found:', assignments.map(a => ({
    id: a._id,
    title: a.title,
    sections: a.sections,
    year: a.year,
    semester: a.semester,
    academicYear: a.academicYear,
    academicYearType: typeof a.academicYear
  })));

  // Also check what assignments exist without filters
  const allAssignments = await Assignment.find({ isActive: true })
    .populate('academicYear', 'name')
    .limit(5)
    .exec();
  
  console.log('Sample of all active assignments:', allAssignments.map(a => ({
    id: a._id,
    title: a.title,
    sections: a.sections,
    year: a.year,
    semester: a.semester,
    academicYear: a.academicYear,
    academicYearName: a.academicYear?.name
  })));

  res.json({
    success: true,
    data: {
      assignments
    }
  });
}));

// @route   POST /api/assignments/upload-file
// @desc    Upload assignment file to Cloudinary
// @access  Private (Teacher)
router.post('/upload-file', [
  authenticate,
  requireTeacher,
  uploadAssignment.single('file')
], asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    res.json({
      success: true,
      data: {
        fileUrl: req.file.path,
        fileName: req.file.originalname,
        fileSize: req.file.size
      }
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
}));

// @route   GET /api/assignments/teaching-assignments
// @desc    Get teacher's teaching assignments for filter dropdowns
// @access  Private (Teacher)
router.get('/teaching-assignments', [
  authenticate,
  requireTeacher
], asyncHandler(async (req, res) => {
  // Get teacher's teaching assignments from sections
  const teachingAssignments = await Section.find({
    'teachers.teacher': req.user._id
  }).populate('academicYear', 'name')
    .populate('subjects.subject', 'name code');

  res.json({
    success: true,
    data: { teachingAssignments }
  });
}));

// @route   GET /api/assignments
// @desc    Get assignments (filtered by role)
// @access  Private
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['assignment', 'test']),
  query('section').optional().isIn(['A', 'B', 'C'])
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    section,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  let query = { isActive: true };
  
  // Filter based on user role
  if (req.user.role === 'student') {
    query.sections = { $in: [req.user.section] };
    query.department = req.user.department;
  } else if (req.user.role === 'teacher') {
    query.teacher = req.user._id;
  }
  
  if (type) query.type = type;
  if (section && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'super-admin')) {
    query.sections = { $in: [section] };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [assignments, total] = await Promise.all([
    Assignment.find(query)
      .populate('teacher', 'firstName lastName email')
      .populate('academicYear', 'name')
      .populate('subject', 'name code') // Populate subject field
      .populate('submissions.student', 'firstName lastName rollNumber')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Assignment.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      assignments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalAssignments: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/assignments/with-file
// @desc    Create new assignment with file upload
// @access  Private (Teacher+)
router.post('/with-file', [
  authenticate,
  requireTeacher,
  uploadAssignment.single('file'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('subject').isMongoId().withMessage('Valid subject is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('type').isIn(['assignment', 'test']).withMessage('Type must be assignment or test'),
  body('sections').notEmpty().withMessage('Sections are required'),
  body('academicYear').isMongoId().withMessage('Valid academic year is required'),
  body('year').isInt({ min: 2, max: 4 }).withMessage('Valid year is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  body('assignmentNumber').isInt({ min: 1, max: 3 }).withMessage('Valid assignment number is required'),
  body('assignedDate').notEmpty().withMessage('Assigned date is required'),
  body('dueDate').notEmpty().withMessage('Due date is required'),
  body('instructions').optional().trim().isLength({ max: 2000 }).withMessage('Instructions must be less than 2000 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Assignment file is required'
    });
  }

  console.log('Uploaded file info:', {
    originalname: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    url: req.file.url,
    secure_url: req.file.secure_url,
    size: req.file.size
  });

  // Parse sections from JSON string
  let sections;
  try {
    sections = JSON.parse(req.body.sections);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sections format'
    });
  }

  const assignmentData = {
    title: req.body.title,
    description: req.body.description || req.body.instructions,
    subject: req.body.subject, // This should be the ObjectId
    subjectCode: req.body.subjectCode,
    type: req.body.type,
    sections: sections,
    academicYear: req.body.academicYear,
    year: parseInt(req.body.year),
    semester: parseInt(req.body.semester),
    assignmentNumber: parseInt(req.body.assignmentNumber),
    assignedDate: new Date(req.body.assignedDate),
    dueDate: new Date(req.body.dueDate),
    instructions: req.body.instructions,
    fileUrl: req.file.secure_url || req.file.url || req.file.path, // Use path as fallback
    fileName: req.file.originalname,
    fileSize: req.file.size,
    teacher: req.user._id,
    department: req.user.department
  };

  // Check if assignment number already exists
  const existingAssignment = await Assignment.checkAssignmentNumber({
    subject: assignmentData.subject,
    sections: assignmentData.sections,
    year: assignmentData.year,
    semester: assignmentData.semester,
    academicYear: assignmentData.academicYear,
    assignmentNumber: assignmentData.assignmentNumber
  });

  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      message: `Assignment ${assignmentData.assignmentNumber} already exists for this subject and class`
    });
  }

  const assignment = new Assignment(assignmentData);
  await assignment.save();

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
    data: { assignment }
  });
}));

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private (Teacher+)
router.post('/', [
  authenticate,
  requireTeacher,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
  body('subject').isMongoId().withMessage('Valid subject is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('type').isIn(['assignment', 'test']).withMessage('Type must be assignment or test'),
  body('sections').isArray({ min: 1 }).withMessage('At least one section must be selected'),
  body('sections.*').isIn(['A', 'B', 'C']).withMessage('Invalid section'),
  body('academicYear').isMongoId().withMessage('Valid academic year is required'),
  body('year').isInt({ min: 2, max: 4 }).withMessage('Valid year is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  body('assignmentNumber').isInt({ min: 1, max: 3 }).withMessage('Valid assignment number is required'),
  body('assignedDate').isISO8601().withMessage('Valid assigned date is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('instructions').optional().trim().isLength({ max: 2000 }).withMessage('Instructions must be less than 2000 characters'),
  body('fileUrl').optional().isURL().withMessage('Valid file URL is required'),
  body('fileName').optional().notEmpty().withMessage('File name is required if file is uploaded'),
  body('fileSize').optional().isInt({ min: 1 }).withMessage('Valid file size is required if file is uploaded')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const assignmentData = {
    ...req.body,
    teacher: req.user._id,
    department: req.user.department
  };

  // Check if assignment number already exists
  const existingAssignment = await Assignment.checkAssignmentNumber({
    subject: assignmentData.subject,
    sections: assignmentData.sections,
    year: assignmentData.year,
    semester: assignmentData.semester,
    academicYear: assignmentData.academicYear,
    assignmentNumber: assignmentData.assignmentNumber
  });

  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      message: `Assignment ${assignmentData.assignmentNumber} already exists for this subject and class`
    });
  }

  const assignment = new Assignment(assignmentData);
  await assignment.save();

  await assignment.populate('teacher', 'firstName lastName email');
  await assignment.populate('academicYear', 'name');

  res.status(201).json({
    success: true,
    message: 'Assignment uploaded successfully',
    data: { assignment }
  });
}));

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('teacher', 'firstName lastName email')
    .populate('submissions.student', 'firstName lastName rollNumber section');

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'student') {
    if (!assignment.sections.includes(req.user.section) || 
        assignment.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  } else if (req.user.role === 'teacher') {
    if (assignment.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  }

  res.json({
    success: true,
    data: { assignment }
  });
}));

// @route   PUT /api/assignments/:id/submission
// @desc    Update student submission status and grade
// @access  Private (Teacher only)
router.put('/:id/submission', [
  authenticate,
  requireTeacher,
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('hasSubmitted').isBoolean().withMessage('Submission status is required'),
  body('grade').optional().isFloat({ min: 0, max: 100 }).withMessage('Grade must be between 0 and 100')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { studentId, hasSubmitted, grade, feedback } = req.body;
  
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check if teacher owns this assignment
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Verify student exists and is in the right section
  const student = await User.findById(studentId);
  if (!student || student.role !== 'student') {
    return res.status(404).json({
      success: false,
      message: 'Student not found'
    });
  }

  if (!assignment.sections.includes(student.section)) {
    return res.status(400).json({
      success: false,
      message: 'Student is not in the assigned sections'
    });
  }

  // Update submission
  await assignment.addSubmission(studentId, hasSubmitted, grade);
  
  if (grade !== undefined) {
    await assignment.updateGrade(studentId, grade, feedback);
  }

  await assignment.populate('submissions.student', 'firstName lastName rollNumber');

  res.json({
    success: true,
    message: 'Submission updated successfully',
    data: { assignment }
  });
}));

// @route   PUT /api/assignments/:id
// @desc    Update assignment
// @access  Private (Teacher only)
router.put('/:id', [
  authenticate,
  requireTeacher,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }),
  body('assignedDate').optional().notEmpty(),
  body('dueDate').optional().notEmpty(),
  body('instructions').optional().trim().isLength({ max: 2000 })
], asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check ownership
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['title', 'description', 'assignedDate', 'dueDate', 'instructions'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'assignedDate' || field === 'dueDate') {
        updates[field] = new Date(req.body[field]);
      } else {
        updates[field] = req.body[field];
      }
    }
  });

  Object.assign(assignment, updates);
  await assignment.save();

  // Populate the subject field for the response
  await assignment.populate('subject', 'name code');

  res.json({
    success: true,
    message: 'Assignment updated successfully',
    data: { assignment }
  });
}));

// @route   DELETE /api/assignments/:id
// @desc    Delete assignment
// @access  Private (Teacher only)
router.delete('/:id', [
  authenticate,
  requireTeacher
], asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check ownership
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  await assignment.deleteOne(); // Actually delete from database

  res.json({
    success: true,
    message: 'Assignment deleted successfully'
  });
}));

// @route   GET /api/assignments/:id/download
// @desc    Download assignment file
// @access  Private (Teacher, Student)
router.get('/:id/download', [
  authenticate
], asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check if user has access to this assignment
  // Teachers can download their own assignments
  // Students can download assignments for their sections
  const isTeacher = req.user.role === 'teacher';
  const isStudent = req.user.role === 'student';
  
  if (isTeacher && assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  if (isStudent) {
    // Check if student is in one of the assignment sections
    const studentSection = req.user.section;
    if (!assignment.sections.includes(studentSection)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  }

  if (!assignment.fileUrl) {
    return res.status(404).json({
      success: false,
      message: 'No file available for this assignment'
    });
  }

  try {
    console.log('Original fileUrl:', assignment.fileUrl);
    
    // Simple approach: redirect to the original URL with download parameter
    const downloadUrl = assignment.fileUrl + '?fl_attachment';
    console.log('Download URL:', downloadUrl);
    
    // Redirect to the download URL
    res.redirect(downloadUrl);
  } catch (error) {
    console.error('Error downloading assignment file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file: ' + error.message
    });
  }
}));

// @route   GET /api/assignments/:id/marks
// @desc    Get assignment marks
// @access  Private (Teacher only)
router.get('/:id/marks', [
  authenticate,
  requireTeacher
], asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check ownership
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  // Get marks from assignment
  const marks = assignment.marks || [];
  
  res.json({
    success: true,
    data: {
      marks,
      assignmentId: assignment._id
    }
  });
}));

// @route   POST /api/assignments/:id/marks
// @desc    Save assignment marks
// @access  Private (Teacher only)
router.post('/:id/marks', [
  authenticate,
  requireTeacher,
  body('studentMarks').isArray().withMessage('Student marks array is required'),
  body('studentMarks.*.studentId').isMongoId().withMessage('Valid student ID is required'),
  body('studentMarks.*.marks').optional().custom((value) => {
    if (value === null || value === undefined || value === '') {
      return true; // Allow null/undefined/empty values
    }
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 10;
  }).withMessage('Marks must be a number between 0 and 10, or null')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Marks validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const assignment = await Assignment.findById(req.params.id);
  
  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: 'Assignment not found'
    });
  }

  // Check ownership
  if (assignment.teacher.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const { studentMarks } = req.body;

  // Update assignment with marks
  assignment.marks = studentMarks.map(mark => ({
    studentId: mark.studentId,
    marks: mark.marks || null,
    updatedAt: new Date(),
    updatedBy: req.user._id
  }));

  await assignment.save();

  res.json({
    success: true,
    message: 'Marks saved successfully',
    data: {
      marks: assignment.marks,
      assignmentId: assignment._id
    }
  });
}));

module.exports = router;