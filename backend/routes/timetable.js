const express = require('express');
const mongoose = require('mongoose');
const { body, query, validationResult } = require('express-validator');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

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

// GET /api/timetable/teacher/:teacherId - Get teacher's aggregated timetable
router.get('/teacher/:teacherId', authenticate, asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  
  try {
    // Get teacher's assignments from User model
    const User = require('../models/User');
    
    const teacher = await User.findById(teacherId)
      .populate('teachingAssignments.subject', 'name code shortName type')
      .populate('classTeacherAssignments.academicYear', 'name year');

    if (!teacher) {
      return res.json({ success: true, data: [] });
    }

    // Combine teaching assignments and class teacher assignments
    const teacherAssignments = [
      ...(teacher.teachingAssignments || []),
      ...(teacher.classTeacherAssignments || [])
    ];

    if (!teacherAssignments || teacherAssignments.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Get all timetables and check which ones have this teacher assigned
    let timetables = await Timetable.find({})
      .populate({
        path: 'academicYear',
        select: 'name year'
      })
      .populate({
        path: 'days.monday days.tuesday days.wednesday days.thursday days.friday days.saturday',
        populate: [
          { path: 'subject', model: 'Subject' },
          { path: 'teacher', model: 'User', select: 'firstName lastName _id' }
        ]
      });
    
    console.log('[TIMETABLE] Found', timetables.length, 'total timetables');

    // Get teacher's assigned subjects from teaching assignments
       const teacherSubjectIds = teacher.teachingAssignments.map(assignment => 
         assignment.subject?._id?.toString() || assignment.subject?.toString()
       );
       
       console.log('[TIMETABLE] Teacher assigned subjects:', teacherSubjectIds);

    // Process timetables to create teacher's schedule
    const teacherSchedule = {};
    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    daysOfWeek.forEach(day => {
      teacherSchedule[day] = Array.from({ length: 6 }, (_, i) => ({
        hour: i + 1,
        isFree: true,
        classes: []
      }));
    });

    console.log('[TIMETABLE] Processing timetables:', timetables.length);
    
    timetables.forEach(timetable => {
      console.log(`[TIMETABLE] Processing timetable: Year ${timetable.year} Section ${timetable.section}`);
      daysOfWeek.forEach(day => {
        if (timetable.days[day]) {
          console.log(`[TIMETABLE] Processing ${day} for timetable Year ${timetable.year} Section ${timetable.section}`);
          timetable.days[day].forEach(slot => {
            const slotSubjectId = slot.subject?._id?.toString() || slot.subject?.toString();
            console.log(`[TIMETABLE] ${day} hour ${slot.hour}: subject=${slot.subject?.name || 'No subject'}, subjectId=${slotSubjectId}`);
            
            // Check if teacher teaches this specific subject
             const isTeachingSubject = slotSubjectId && teacherSubjectIds.includes(slotSubjectId);
             
             if (isTeachingSubject) {
              const hourIndex = slot.hour - 1;
              if (hourIndex >= 0 && hourIndex < 6) {
                teacherSchedule[day][hourIndex].isFree = false;
                teacherSchedule[day][hourIndex].classes.push({
                  year: timetable.year,
                  section: timetable.section,
                  subject: slot.subject,
                  type: slot.type || 'lecture'
                });
                console.log(`[TIMETABLE] MATCHED: ${day} hour ${slot.hour} - ${timetable.year}${timetable.section} - ${slot.subject?.name || 'Subject'}`);
              }
            }
          });
        }
      });
    });
    
    console.log('[TIMETABLE] Final teacher schedule:', JSON.stringify(teacherSchedule, null, 2));

    res.json({ success: true, data: teacherSchedule });
  } catch (error) {
    console.error('[TIMETABLE] Error fetching teacher timetable:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch teacher timetable' });
  }
}));

module.exports = router;