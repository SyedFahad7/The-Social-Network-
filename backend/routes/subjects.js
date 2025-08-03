const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Subject = require('../models/Subject');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/subjects - list subjects with filters
router.get('/', [
  authenticate,
  query('department').optional().isMongoId(),
  query('year').optional().isInt(),
  query('semester').optional().isInt(),
  query('academicYear').optional().isMongoId(),
], asyncHandler(async (req, res) => {
  const filters = {};
  if (req.query.department) filters.department = req.query.department;
  if (req.query.year) filters.year = parseInt(req.query.year);
  if (req.query.semester) filters.semester = parseInt(req.query.semester);
  if (req.query.academicYear) filters.academicYear = req.query.academicYear;
  const subjects = await Subject.find(filters);
  res.json({ success: true, data: subjects });
}));

// GET /api/subjects/:id - get subject by ID
router.get('/:id', [
  authenticate,
], asyncHandler(async (req, res) => {
  const subject = await Subject.findById(req.params.id);
  if (!subject) {
    return res.status(404).json({ success: false, message: 'Subject not found' });
  }
  res.json({ success: true, data: subject });
}));

// POST /api/subjects - create subject (super admin only)
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('name').notEmpty(),
  body('code').notEmpty(),
  body('department').notEmpty(),
  body('year').isInt(),
  body('semester').isInt(),
  body('academicYear').notEmpty(),
  body('type').isIn(['lecture', 'lab']).withMessage('Type must be lecture or lab'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const subject = await Subject.create(req.body);
  res.status(201).json({ success: true, data: subject });
}));

// PUT /api/subjects/:id - update subject (super admin only)
router.put('/:id', [
  authenticate,
  requireSuperAdmin,
  body('name').optional(),
  body('code').optional(),
  body('department').optional(),
  body('year').optional().isInt(),
  body('semester').optional().isInt(),
  body('academicYear').optional(),
  body('type').optional().isIn(['lecture', 'lab']).withMessage('Type must be lecture or lab'),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: subject });
}));

// DELETE /api/subjects/:id - delete subject (super admin only)
router.delete('/:id', [
  authenticate,
  requireSuperAdmin,
], asyncHandler(async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Subject deleted' });
}));

module.exports = router; 