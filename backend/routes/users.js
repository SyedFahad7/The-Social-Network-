const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireSuperAdmin, requireAdmin } = require('../middleware/auth');
const Department = require('../models/Department');
const mongoose = require('mongoose');

const router = express.Router();

console.log('[USERS ROUTES] users.js loaded');

// @route   GET /api/users
// @desc    Get all users (with filtering and pagination)
// @access  Private (Admin/Super Admin)
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('role').optional().isIn(['student', 'teacher', 'super-admin']).withMessage('Invalid role'),
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
  } else if (req.user.role === 'super-admin') {
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
    console.log('[USERS API] super-admin query:', query);
  } else {
    // Debug logging
    console.log('[USERS API] Access denied for role:', req.user.role);
    return res.status(403).json({ success: false, message: 'Access denied. Required role: super-admin or teacher.' });
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
    .isIn(['student', 'teacher', 'super-admin'])
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
// @access  Private (Super Admin only)
router.get('/stats', [
  authenticate,
  requireSuperAdmin
], asyncHandler(async (req, res) => {
  const stats = await User.getUserStats();
  
  res.json({
    success: true,
    data: { stats }
  });
}));

// Check if a class teacher assignment exists for a section/year/semester/academicYear
router.get('/class-teacher-exists', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { section, year, semester, academicYear } = req.query;
  if (!section || !year || !semester || !academicYear) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  const teacher = await User.findOne({
    role: 'teacher',
    classTeacherAssignments: {
      $elemMatch: {
        section,
        year: parseInt(year),
        semester: parseInt(semester),
        academicYear
      }
    }
  });
  res.json({ exists: !!teacher, teacher });
}));

// Check if a subject assignment exists for a section/year/semester/academicYear/subject
router.get('/subject-assigned-exists', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { section, year, semester, academicYear, subject } = req.query;
  if (!section || !year || !semester || !academicYear || !subject) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  const teacher = await User.findOne({
    role: 'teacher',
    teachingAssignments: {
      $elemMatch: {
        section,
        year: parseInt(year),
        semester: parseInt(semester),
        academicYear,
        subject
      }
    }
  });
  res.json({ exists: !!teacher, teacher });
}));

// Get all assignments for a teacher
router.get('/:id/assignments', [authenticate], asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log('[ASSIGNMENTS ROUTE] Request for assignments of user:', id);
  console.debug('[ASSIGNMENTS ROUTE] Request for assignments of user:', id);
  console.log('[ASSIGNMENTS ROUTE] Authenticated user:', req.user ? req.user._id : 'none', 'Role:', req.user ? req.user.role : 'none');
  console.debug('[ASSIGNMENTS ROUTE] Authenticated user:', req.user ? req.user._id : 'none', 'Role:', req.user ? req.user.role : 'none');
  // Only allow super-admins or the teacher themselves
  if (req.user.role !== 'super-admin' && req.user._id.toString() !== id) {
    console.log('[ASSIGNMENTS ROUTE] Access denied for user:', req.user._id, 'on target:', id);
    console.debug('[ASSIGNMENTS ROUTE] Access denied for user:', req.user._id, 'on target:', id);
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  const user = await User.findById(id)
    .populate('teachingAssignments.subject', 'name shortName')
    .populate('teachingAssignments.academicYear', 'name yearLabel')
    .populate('classTeacherAssignments.academicYear', 'name yearLabel');
  console.log('[ASSIGNMENTS ROUTE] Raw user document:', JSON.stringify(user, null, 2));
  let teachingAssignments = [];
  let classTeacherAssignments = [];
  if (user && user.role === 'teacher') {
    teachingAssignments = user.teachingAssignments || [];
    classTeacherAssignments = user.classTeacherAssignments || [];
  }
  console.log('[ASSIGNMENTS ROUTE] teachingAssignments:', JSON.stringify(teachingAssignments, null, 2));
  console.log('[ASSIGNMENTS ROUTE] classTeacherAssignments:', JSON.stringify(classTeacherAssignments, null, 2));
  console.log('[ASSIGNMENTS ROUTE] Sending response:', { teachingAssignmentsLength: teachingAssignments.length, classTeacherAssignmentsLength: classTeacherAssignments.length });
  res.json({
    teachingAssignments,
    classTeacherAssignments
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
    .isIn(['student', 'teacher', 'super-admin'])
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

// --- Faculty Assignment Endpoints ---

// Add a teaching assignment to a teacher
router.post('/:id/teaching-assignment', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, section, year, semester, academicYear } = req.body;
  if (!subject || !section || !year || !semester || !academicYear) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }
  // Prevent another teacher from being assigned the same subject/section/year/semester/AY
  const assignedToAnother = await User.findOne({
    _id: { $ne: id },
    role: 'teacher',
    teachingAssignments: {
      $elemMatch: {
        subject,
        section,
        year,
        semester,
        academicYear
      }
    }
  });
  if (assignedToAnother) {
    return res.status(400).json({ success: false, message: `This subject is already assigned to ${assignedToAnother.firstName} ${assignedToAnother.lastName}.` });
  }
  const user = await User.findById(id);
  if (!user || user.role !== 'teacher') {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }
  // Prevent duplicate assignment for the same teacher
  const exists = user.teachingAssignments.some(a =>
    a.subject.toString() === subject &&
    a.section === section &&
    a.year === year &&
    a.semester === semester &&
    a.academicYear.toString() === academicYear
  );
  if (exists) {
    return res.status(400).json({ success: false, message: 'Assignment already exists.' });
  }
  user.teachingAssignments.push({ subject, section, year, semester, academicYear });
  await user.save();
  res.json({ success: true, message: 'Teaching assignment added.', data: user.teachingAssignments });
}));

// Remove a teaching assignment from a teacher
router.delete('/:id/teaching-assignment', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, section, year, semester, academicYear } = req.body;
  const user = await User.findById(id);
  if (!user || user.role !== 'teacher') {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }
  user.teachingAssignments = user.teachingAssignments.filter(a =>
    !(a.subject.toString() === subject &&
      a.section === section &&
      a.year === year &&
      a.semester === semester &&
      a.academicYear.toString() === academicYear)
  );
  await user.save();
  res.json({ success: true, message: 'Teaching assignment removed.', data: user.teachingAssignments });
}));

// Add a class teacher assignment
router.post('/:id/class-teacher-assignment', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { section, year, semester, academicYear } = req.body;
  // Convert year and semester to numbers for all logic
  const yearNum = Number(year);
  const semesterNum = Number(semester);
  if (!section || !yearNum || !semesterNum || !academicYear) {
    console.log('[ASSIGN CT] Missing required fields', { section, year, semester, academicYear });
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // 1. Check if a CT already exists for this section/year/semester/academicYear
  const existingCT = await User.findOne({
    'classTeacherAssignments.section': section,
    'classTeacherAssignments.year': yearNum,
    'classTeacherAssignments.semester': semesterNum,
    'classTeacherAssignments.academicYear': academicYear
  });
  if (existingCT) {
    return res.status(400).json({ success: false, message: `A class teacher is already assigned for Section ${section}, Year ${yearNum}, Semester ${semesterNum}, Academic Year ${academicYear}.` });
  }

  // 2. Check if this teacher is already CT for any section in the same year
  const teacher = await User.findById(id);
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }
  const alreadyCTForYear = teacher.classTeacherAssignments?.find(a => a.year === yearNum);
  if (alreadyCTForYear) {
    return res.status(400).json({ success: false, message: `This teacher is already class teacher for Section ${alreadyCTForYear.section}, Year ${yearNum}.` });
  }

  // Prevent duplicate assignment for the same teacher/section
  const exists = teacher.classTeacherAssignments.some(a =>
    a.section === section &&
    a.year === yearNum &&
    a.semester === semesterNum &&
    a.academicYear.toString() === academicYear
  );
  if (exists) {
    console.log('[ASSIGN CT] Assignment already exists for this teacher/section/year/semester/academicYear');
    return res.status(400).json({ success: false, message: 'Assignment already exists.' });
  }
  teacher.classTeacherAssignments.push({ section, year: yearNum, semester: semesterNum, academicYear });
  await teacher.save();
  console.log('[ASSIGN CT] Class teacher assignment added successfully');
  res.json({ success: true, message: 'Class teacher assignment added.', data: teacher.classTeacherAssignments });
}));

// Remove a class teacher assignment
router.delete('/:id/class-teacher-assignment', [authenticate, requireSuperAdmin], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { section, year, semester, academicYear } = req.body;
  const user = await User.findById(id);
  if (!user || user.role !== 'teacher') {
    return res.status(404).json({ success: false, message: 'Teacher not found.' });
  }
  user.classTeacherAssignments = user.classTeacherAssignments.filter(a =>
    !(a.section === section &&
      a.year === year &&
      a.semester === semester &&
      a.academicYear.toString() === academicYear)
  );
  await user.save();
  res.json({ success: true, message: 'Class teacher assignment removed.', data: user.classTeacherAssignments });
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

// Add this to backend/routes/users.js for debugging
router.get('/debug/students', async (req, res) => {
  const students = await User.find({
    role: 'student',
    department: new mongoose.Types.ObjectId('6866e33640150fc76c1cf66c'),
    academicYear: new mongoose.Types.ObjectId('6867050340150fc76c1cf688'),
    year: 4,
    section: 'C',
    isActive: true
  });
  res.json({ count: students.length, students });
});

router.use((req, res, next) => {
  console.log('[USERS ROUTES] Unmatched route:', req.method, req.originalUrl);
  next();
});

module.exports = router;