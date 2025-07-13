const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const Department = require('../models/Department');
const mongoose = require('mongoose');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (with filtering and pagination)
// @access  Private (Admin/Super Admin)
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('role').optional().isIn(['student', 'teacher', 'admin', 'super-admin']).withMessage('Invalid role'),
  query('department').optional().notEmpty().withMessage('Department cannot be empty'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term cannot be empty'),
  query('academicYear').optional().notEmpty(),
  query('year').optional().isInt(),
  query('section').optional().notEmpty()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Debug logging
  console.log('[USERS API] role:', req.user.role, 'query:', req.query);

  const {
    page = 1,
    limit = 10,
    role,
    department,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    academicYear,
    year,
    section
  } = req.query;

  // Build query
  const query = { isActive: true };
  
  if (req.user.role === 'teacher') {
    query.department = new mongoose.Types.ObjectId(req.user.department);
    query.role = 'student';
    if (academicYear) query.academicYear = new mongoose.Types.ObjectId(academicYear); // <-- Fix here!
    if (year) query.year = parseInt(year);
    if (section) query.section = section;
    // Debug logging
    console.log('[USERS API] teacher query:', query);
  } else if (req.user.role === 'admin' || req.user.role === 'super-admin') {
    if (role) query.role = role;
    if (department) query.department = new mongoose.Types.ObjectId(department);
    if (academicYear) query.academicYear = new mongoose.Types.ObjectId(academicYear);
    if (year) query.year = parseInt(year);
    if (section) query.section = section;
    if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { rollNumber: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
    }
    // Debug logging
    console.log('[USERS API] admin/super-admin query:', query);
  } else {
    // Debug logging
    console.log('[USERS API] Access denied for role:', req.user.role);
    return res.status(403).json({ success: false, message: 'Access denied. Required role: admin, super-admin, or teacher.' });
  }

  // Calculate pagination
  let effectiveLimit = parseInt(limit);
  if (!limit && role === 'student') effectiveLimit = 1000;
  const skip = (parseInt(page) - 1) * effectiveLimit;
  let sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  if (role === 'student') {
    sort = { rollNumber: 1 };
  }

  // Execute query
  console.log('[USERS API] Final query:', query);
  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password -emailChangeOTP -resetPasswordToken')
      .sort(sort)
      .skip(skip)
      .limit(effectiveLimit)
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
    .notEmpty()
    .withMessage('Department is required'),
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
    .withMessage('Employee ID is required for teachers'),
  body('phone')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      // Only validate if a value is provided
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    })
    .withMessage('Please provide a valid phone number')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
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
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin', 'super-admin'])
    .withMessage('Please select a valid role'),
  body('department')
    .optional()
    .notEmpty()
    .withMessage('Department is required'),
  body('phone')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      // Only validate if a value is provided
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    })
    .withMessage('Please provide a valid phone number'),
  body('rollNumber')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      return value.length >= 1;
    })
    .withMessage('Roll number cannot be empty'),
  body('employeeId')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true; // Allow empty values
      }
      return value.length >= 1;
    })
    .withMessage('Employee ID cannot be empty'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], asyncHandler(async (req, res) => {
  console.log('PUT /api/users/:id - Request body:', req.body);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { id } = req.params;
  console.log('Updating user with ID:', id);
  
  // Check if user can update this profile
  if (req.user._id.toString() !== id && 
      req.user.role !== 'admin' && 
      req.user.role !== 'super-admin') {
    console.log('Access denied - user role:', req.user.role, 'user ID:', req.user._id, 'target ID:', id);
    return res.status(403).json({
      success: false,
      message: 'Access denied'
    });
  }

  const user = await User.findById(id);
  if (!user) {
    console.log('User not found with ID:', id);
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  console.log('Found user:', user.email);

  // Update allowed fields
  const allowedUpdates = [
    'firstName', 
    'lastName', 
    'role',
    'department', 
    'phone',
    'rollNumber',
    'employeeId',
    'isActive',
    'profilePicture'
  ];
  
  const updates = {};
  
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  console.log('Updates to apply:', updates);

  // Check for duplicate roll number (for students)
  if (updates.rollNumber && updates.rollNumber !== user.rollNumber) {
    const existingRollNumber = await User.findOne({ 
      rollNumber: updates.rollNumber,
      _id: { $ne: id }
    });
    if (existingRollNumber) {
      console.log('Duplicate roll number found:', updates.rollNumber);
      return res.status(400).json({
        success: false,
        message: 'Roll number already exists'
      });
    }
  }

  // Check for duplicate employee ID (for teachers/admins)
  if (updates.employeeId && updates.employeeId !== user.employeeId) {
    const existingEmployeeId = await User.findOne({ 
      employeeId: updates.employeeId,
      _id: { $ne: id }
    });
    if (existingEmployeeId) {
      console.log('Duplicate employee ID found:', updates.employeeId);
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
  }

  try {
    Object.assign(user, updates);
    console.log('About to save user with data:', {
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      employeeId: user.employeeId,
      isActive: user.isActive
    });
    
    await user.save();
    console.log('User saved successfully');
  } catch (saveError) {
    console.error('Error saving user:', saveError);
    return res.status(400).json({
      success: false,
      message: 'Error saving user: ' + saveError.message
    });
  }

  res.json({
    success: true,
    message: 'User updated successfully',
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
        phone: user.phone,
        isActive: user.isActive,
        profilePicture: user.profilePicture,
        updatedAt: user.updatedAt
      }
    }
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

// @route   GET /api/users/debug/department/:id
// @desc    Debug endpoint to check if department exists
// @access  Private (Super Admin only)
router.get('/debug/department/:id', [
  authenticate,
  requireSuperAdmin
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    const department = await Department.findById(id);
    
    res.json({
      success: true,
      data: {
        departmentId: id,
        department: department,
        exists: !!department,
        isActive: department ? department.isActive : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking department: ' + error.message
    });
  }
}));

// DEV-ONLY: Migration endpoint to convert department _id from String to ObjectId
router.post('/migrate-departments-to-objectid', async (req, res) => {
  try {
    const departments = await Department.find({});
    let migrated = 0;
    for (const dept of departments) {
      if (typeof dept._id === 'string') {
        // Create new department with ObjectId
        const newDept = new Department({
          name: dept.name,
          code: dept.code,
          description: dept.description,
          isActive: dept.isActive,
          hod: dept.hod,
          totalStudents: dept.totalStudents,
          totalTeachers: dept.totalTeachers,
          totalAdmins: dept.totalAdmins
        });
        await newDept.save();
        // Update users to reference new ObjectId
        await User.updateMany({ department: dept._id }, { department: newDept._id });
        // Remove old department
        await Department.deleteOne({ _id: dept._id });
        migrated++;
      }
    }
    res.json({ success: true, message: `Migrated ${migrated} departments to ObjectId.` });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ success: false, message: 'Migration failed', error: err.message });
  }
});

module.exports = router;