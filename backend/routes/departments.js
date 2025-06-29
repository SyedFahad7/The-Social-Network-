const express = require('express');
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments (filtered by user's department if not super-admin)
// @access  Private
router.get('/', authenticate, asyncHandler(async (req, res) => {
  let query = { isActive: true };
  
  // If user is not super-admin, only show their department
  if (req.user.role !== 'super-admin') {
    query._id = req.user.department;
  }

  const departments = await Department.find(query).sort({ name: 1 });
  
  res.json({
    success: true,
    data: departments
  });
}));

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }

  // Check if user has access to this department
  if (req.user.role !== 'super-admin' && req.user.department !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  res.json({
    success: true,
    data: department
  });
}));

// @route   POST /api/departments
// @desc    Create new department (super-admin only)
// @access  Private
router.post('/', [
  authenticate,
  body('_id')
    .isString()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Department ID must be between 3 and 50 characters'),
  body('name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department name must be between 2 and 100 characters'),
  body('code')
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Department code must be between 2 and 10 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  // Only super-admin can create departments
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super administrators can create departments'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { _id, name, code, description } = req.body;

  // Check if department already exists
  const existingDepartment = await Department.findById(_id);
  if (existingDepartment) {
    return res.status(400).json({
      success: false,
      message: 'Department with this ID already exists'
    });
  }

  const department = new Department({
    _id,
    name,
    code: code.toUpperCase(),
    description
  });

  await department.save();

  res.status(201).json({
    success: true,
    message: 'Department created successfully',
    data: department
  });
}));

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private
router.put('/:id', [
  authenticate,
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department name must be between 2 and 100 characters'),
  body('code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 10 })
    .withMessage('Department code must be between 2 and 10 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  // Only super-admin can update departments
  if (req.user.role !== 'super-admin') {
    return res.status(403).json({
      success: false,
      message: 'Only super administrators can update departments'
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }

  // Update fields
  if (req.body.name) department.name = req.body.name;
  if (req.body.code) department.code = req.body.code.toUpperCase();
  if (req.body.description !== undefined) department.description = req.body.description;
  if (req.body.isActive !== undefined) department.isActive = req.body.isActive;

  await department.save();

  res.json({
    success: true,
    message: 'Department updated successfully',
    data: department
  });
}));

// @route   GET /api/departments/:id/stats
// @desc    Get department statistics
// @access  Private
router.get('/:id/stats', authenticate, asyncHandler(async (req, res) => {
  // Check if user has access to this department
  if (req.user.role !== 'super-admin' && req.user.department !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const department = await Department.findById(req.params.id);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }

  // Get user counts for this department
  const [students, teachers, admins] = await Promise.all([
    User.countDocuments({ department: req.params.id, role: 'student', isActive: true }),
    User.countDocuments({ department: req.params.id, role: 'teacher', isActive: true }),
    User.countDocuments({ department: req.params.id, role: 'admin', isActive: true })
  ]);

  const stats = {
    department: department.name,
    totalStudents: students,
    totalTeachers: teachers,
    totalAdmins: admins,
    totalUsers: students + teachers + admins
  };

  res.json({
    success: true,
    data: stats
  });
}));

module.exports = router; 