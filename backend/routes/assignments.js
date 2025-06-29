const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

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

// @route   POST /api/assignments
// @desc    Create new assignment
// @access  Private (Teacher+)
router.post('/', [
  authenticate,
  requireTeacher,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required and must be less than 2000 characters'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('type').isIn(['assignment', 'test']).withMessage('Type must be assignment or test'),
  body('sections').isArray({ min: 1 }).withMessage('At least one section must be selected'),
  body('sections.*').isIn(['A', 'B', 'C']).withMessage('Invalid section'),
  body('dueDate').isISO8601().withMessage('Valid due date is required')
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

  // Validate due date is in future
  if (new Date(assignmentData.dueDate) <= new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Due date must be in the future'
    });
  }

  const assignment = new Assignment(assignmentData);
  await assignment.save();

  await assignment.populate('teacher', 'firstName lastName email');

  res.status(201).json({
    success: true,
    message: 'Assignment created successfully',
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
    if (assignment.teacher._id.toString() !== req.user._id.toString()) {
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
  body('dueDate').optional().isISO8601()
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
  const allowedUpdates = ['title', 'description', 'dueDate'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(assignment, updates);
  await assignment.save();

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

  assignment.isActive = false;
  await assignment.save();

  res.json({
    success: true,
    message: 'Assignment deleted successfully'
  });
}));

module.exports = router;