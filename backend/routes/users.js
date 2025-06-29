const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (with filtering and pagination)
// @access  Private (Admin/Super Admin)
router.get('/', [
  authenticate,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['student', 'teacher', 'admin', 'super-admin']).withMessage('Invalid role'),
  query('department').optional().notEmpty().withMessage('Department cannot be empty'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty')
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
    page = 1,
    limit = 10,
    role,
    department,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = { isActive: true };
  
  if (role) query.role = role;
  if (department) query.department = department;
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Execute query
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -emailChangeOTP -resetPasswordToken')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName email'),
    User.countDocuments(query)
  ]);

  // Calculate pagination info
  const totalPages = Math.ceil(total / parseInt(limit));
  const hasNextPage = parseInt(page) < totalPages;
  const hasPrevPage = parseInt(page) > 1;

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers: total,
        hasNextPage,
        hasPrevPage,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Super Admin only)
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('role')
    .isIn(['student', 'teacher', 'admin', 'super-admin'])
    .withMessage('Please select a valid role'),
  body('department')
    .isIn(['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering'])
    .withMessage('Please select a valid department'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  // Conditional validation for students
  body('rollNumber')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Roll number is required for students'),
  body('section')
    .if(body('role').equals('student'))
    .isIn(['A', 'B', 'C'])
    .withMessage('Section is required for students'),
  // Conditional validation for teachers
  body('employeeId')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Employee ID is required for teachers')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const userData = {
    ...req.body,
    createdBy: req.user._id,
    isEmailVerified: true // Admin-created accounts are pre-verified
  };

  // Check if email already exists
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Email already exists'
    });
  }

  // Check for duplicate roll number (for students)
  if (userData.role === 'student' && userData.rollNumber) {
    const existingRollNumber = await User.findOne({ rollNumber: userData.rollNumber });
    if (existingRollNumber) {
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }
  }

  // Check for duplicate employee ID (for teachers)
  if (userData.role === 'teacher' && userData.employeeId) {
    const existingEmployeeId = await User.findOne({ employeeId: userData.employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
  }

  const user = new User(userData);
  await user.save();

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        rollNumber: user.rollNumber,
        section: user.section,
        employeeId: user.employeeId,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    }
  });
}));

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin/Super Admin)
router.get('/stats', [
  authenticate,
  requireAdmin
], asyncHandler(async (req, res) => {
  const stats = await User.getUserStats();
  
  res.json({
    success: true,
    data: { stats }
  });
}));

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin/Super Admin or own profile)
router.get('/:id', [
  authenticate
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if user can access this profile
  if (req.user._id.toString() !== id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'super-admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const user = await User.findById(id)
    .select('-password -emailChangeOTP -resetPasswordToken')
    .populate('createdBy', 'firstName lastName email');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    data: { user }
  });
}));

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin/Super Admin or own profile)
router.put('/:id', [
  authenticate,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('department')
    .optional()
    .isIn(['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering'])
    .withMessage('Please select a valid department')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  
  // Check if user can update this profile
  if (req.user._id.toString() !== id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'super-admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update allowed fields
  const allowedUpdates = ['firstName', 'lastName', 'department', 'profilePicture'];
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(user, updates);
  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: { user }
  });
}));

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete)
// @access  Private (Super Admin only)
router.delete('/:id', [
  authenticate,
  requireSuperAdmin
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user._id.toString() === id) {
    return res.status(400).json({
      success: false,
      message: 'You cannot delete your own account'
    });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Soft delete
  user.isActive = false;
  await user.save();

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
}));

module.exports = router;