const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Certificate = require('../models/Certificate');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/certificates
// @desc    Get certificates
// @access  Private
router.get('/', [
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'under-review']),
  query('category').optional().isIn(['technical', 'non-technical', 'academic', 'extracurricular', 'professional', 'research'])
], asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  let query = {};
  
  // Filter based on user role
  if (req.user.role === 'student') {
    query.student = req.user._id;
  }
  
  if (status) query.status = status;
  if (category) query.category = category;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [certificates, total] = await Promise.all([
    Certificate.find(query)
      .populate('student', 'firstName lastName rollNumber section department')
      .populate('reviewedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit)),
    Certificate.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      certificates,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCertificates: total,
        limit: parseInt(limit)
      }
    }
  });
}));

// @route   POST /api/certificates
// @desc    Upload certificate
// @access  Private (Student only)
router.post('/', [
  authenticate,
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required and must be less than 200 characters'),
  body('issuer').trim().isLength({ min: 1, max: 200 }).withMessage('Issuer is required'),
  body('certificateType').isIn(['course-completion', 'certification', 'achievement', 'participation', 'internship', 'project', 'competition', 'other']).withMessage('Valid certificate type is required'),
  body('category').isIn(['technical', 'non-technical', 'academic', 'extracurricular', 'professional', 'research']).withMessage('Valid category is required'),
  body('issueDate').isISO8601().withMessage('Valid issue date is required'),
  body('fileUrl').isURL().withMessage('Valid file URL is required'),
  body('fileName').trim().notEmpty().withMessage('File name is required'),
  body('fileSize').isInt({ min: 1 }).withMessage('Valid file size is required'),
  body('fileType').isIn(['pdf', 'jpg', 'jpeg', 'png']).withMessage('Valid file type is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Only students can upload certificates
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can upload certificates'
    });
  }

  const certificateData = {
    ...req.body,
    student: req.user._id
  };

  // Validate issue date is not in future
  if (new Date(certificateData.issueDate) > new Date()) {
    return res.status(400).json({
      success: false,
      message: 'Issue date cannot be in the future'
    });
  }

  const certificate = new Certificate(certificateData);
  await certificate.save();

  await certificate.populate('student', 'firstName lastName rollNumber section department');

  res.status(201).json({
    success: true,
    message: 'Certificate uploaded successfully',
    data: { certificate }
  });
}));

// @route   PUT /api/certificates/:id/approve
// @desc    Approve certificate
// @access  Private (Admin+)
router.put('/:id/approve', [
  authenticate,
  requireAdmin,
  body('points').optional().isFloat({ min: 0, max: 100 }).withMessage('Points must be between 0 and 100'),
  body('comments').optional().trim().isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  const { points = 0, comments } = req.body;
  
  const certificate = await Certificate.findById(req.params.id);
  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: 'Certificate not found'
    });
  }

  if (certificate.status !== 'pending' && certificate.status !== 'under-review') {
    return res.status(400).json({
      success: false,
      message: 'Certificate has already been reviewed'
    });
  }

  await certificate.approve(req.user._id, comments, points);
  await certificate.populate('student', 'firstName lastName rollNumber section department');
  await certificate.populate('reviewedBy', 'firstName lastName email');

  res.json({
    success: true,
    message: 'Certificate approved successfully',
    data: { certificate }
  });
}));

// @route   PUT /api/certificates/:id/reject
// @desc    Reject certificate
// @access  Private (Admin+)
router.put('/:id/reject', [
  authenticate,
  requireAdmin,
  body('comments').trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason is required and cannot exceed 500 characters')
], asyncHandler(async (req, res) => {
  const { comments } = req.body;
  
  const certificate = await Certificate.findById(req.params.id);
  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: 'Certificate not found'
    });
  }

  if (certificate.status !== 'pending' && certificate.status !== 'under-review') {
    return res.status(400).json({
      success: false,
      message: 'Certificate has already been reviewed'
    });
  }

  await certificate.reject(req.user._id, comments);
  await certificate.populate('student', 'firstName lastName rollNumber section department');
  await certificate.populate('reviewedBy', 'firstName lastName email');

  res.json({
    success: true,
    message: 'Certificate rejected successfully',
    data: { certificate }
  });
}));

// @route   GET /api/certificates/stats
// @desc    Get certificate statistics
// @access  Private (Admin+)
router.get('/stats', [
  authenticate,
  requireAdmin
], asyncHandler(async (req, res) => {
  const stats = await Certificate.getStats();
  
  res.json({
    success: true,
    data: { stats }
  });
}));

module.exports = router;