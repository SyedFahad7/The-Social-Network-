const express = require('express');
const { body, validationResult } = require('express-validator');
const AcademicYear = require('../models/AcademicYear');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/academic-years - list all academic years
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const years = await AcademicYear.find();
  res.json({ success: true, data: years });
}));

// POST /api/academic-years - create academic year (super admin only)
router.post('/', [
  authenticate,
  requireSuperAdmin,
  body('yearLabel').notEmpty(),
  body('currentSemesterMap').notEmpty(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const year = await AcademicYear.create(req.body);
  res.status(201).json({ success: true, data: year });
}));

// PUT /api/academic-years/:id - update academic year (super admin only)
router.put('/:id', [
  authenticate,
  requireSuperAdmin,
  body('yearLabel').optional(),
  body('currentSemesterMap').optional(),
  body('active').optional(),
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: year });
}));

// DELETE /api/academic-years/:id - delete academic year (super admin only)
router.delete('/:id', [
  authenticate,
  requireSuperAdmin,
], asyncHandler(async (req, res) => {
  await AcademicYear.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Academic year deleted' });
}));

module.exports = router; 