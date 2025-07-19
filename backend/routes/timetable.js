const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Timetable = require('../models/Timetable');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

const router = express.Router();

// GET /api/timetable?section=A&year=4&semester=7&academicYear=...
router.get('/', authenticate, [
  query('section').isString(),
  query('year').isInt(),
  query('semester').isInt(),
  query('academicYear').isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { section, year, semester, academicYear } = req.query;
  const queryObj = {
    section,
    year: parseInt(year),
    semester: parseInt(semester),
    academicYear: new mongoose.Types.ObjectId(academicYear)
  };
  console.log('[TIMETABLE] Query:', queryObj);
  const timetable = await Timetable.findOne(queryObj)
    .populate({
      path: 'days.monday.subject days.tuesday.subject days.wednesday.subject days.thursday.subject days.friday.subject days.saturday.subject',
      select: 'name code shortName type'
    })
    .populate({
      path: 'days.monday.teacher days.tuesday.teacher days.wednesday.teacher days.thursday.teacher days.friday.teacher days.saturday.teacher',
      select: 'firstName lastName profilePicture email teachingAssignments'
    });
  if (!timetable) {
    console.log('[TIMETABLE] No timetable found for query:', queryObj);
    return res.json({ success: true, data: null });
  }
  // Log each slot's subject and teacher
  for (const day of Object.keys(timetable.days)) {
    for (const slot of timetable.days[day]) {
      console.log(`[TIMETABLE] ${day} hour ${slot.hour}: subject=${slot.subject?._id || slot.subject} teacher=${slot.teacher?._id || slot.teacher}`);
    }
  }
  res.json({ success: true, data: timetable });
}));

// POST /api/timetable (create or update)
router.post('/', authenticate, [
  body('section').isString(),
  body('year').isInt(),
  body('semester').isInt(),
  body('academicYear').isString(),
  body('days').isObject()
], asyncHandler(async (req, res) => {
  // TODO: Add class teacher check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  const { section, year, semester, academicYear, days } = req.body;
  const timetable = await Timetable.findOneAndUpdate(
    { section, year, semester, academicYear: new mongoose.Types.ObjectId(academicYear) },
    { days, updatedBy: req.user._id, updatedAt: new Date() },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: timetable });
}));

module.exports = router;