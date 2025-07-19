const express = require('express');
const { query, validationResult, body } = require('express-validator');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const mongoose = require('mongoose');

// Import Redis with error handling
let redisClient, connectRedis;
try {
  const redis = require('../lib/redisClient');
  redisClient = redis.client;
  connectRedis = redis.connectRedis;
} catch (error) {
  console.error('Redis not available:', error.message);
  // Fallback functions
  connectRedis = async () => {};
  redisClient = {
    sMembers: async () => [],
    get: async () => null
  };
}

const router = express.Router();

// @route   GET /api/classmates
// @desc    Get classmates for a student (same section, year, department)
// @access  Private (Student only)
router.get('/', [
  authenticate,
  query('search').optional().isString().withMessage('Search must be a string'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
], asyncHandler(async (req, res) => {
  console.log('[CLASSMATES] Request received:', req.user.email, req.user.role);
  console.log('[CLASSMATES] Query params:', req.query);
  
  // Only students can access this endpoint
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can access classmates'
    });
  }

  try {
    const { search, limit = 1000 } = req.query;
    console.log('[CLASSMATES] Query params:', { search, limit, userSection: req.user.section, userYear: req.user.year });
    console.log('[CLASSMATES] Limit being used:', limit);
    console.log('[CLASSMATES] Limit type:', typeof limit);
    console.log('[CLASSMATES] Parsed limit:', parseInt(limit));

    // Convert string IDs to ObjectIds for proper MongoDB querying
    const departmentId = mongoose.Types.ObjectId.isValid(req.user.department) 
      ? new mongoose.Types.ObjectId(req.user.department) 
      : req.user.department;
    
    const academicYearId = mongoose.Types.ObjectId.isValid(req.user.academicYear) 
      ? new mongoose.Types.ObjectId(req.user.academicYear) 
      : req.user.academicYear;

    console.log('[CLASSMATES] Converted IDs:', { departmentId, academicYearId });

    // Build query for classmates (same section, year, department, academic year)
    const query = {
      role: 'student',
      isActive: true,
      department: departmentId,
      year: req.user.year,
      section: req.user.section,
      // academicYear: academicYearId, // Remove this requirement for now
      _id: { $ne: new mongoose.Types.ObjectId(req.user._id) } // Exclude current user
    };

    console.log('[CLASSMATES] MongoDB query:', JSON.stringify(query, null, 2));

    // First, let's see what students exist with just section, year, department
    const allStudentsInSection = await User.find({
      role: 'student',
      isActive: true,
      department: departmentId,
      year: req.user.year,
      section: req.user.section
    }).select('firstName lastName email rollNumber academicYear _id');

    console.log('[CLASSMATES] All students in section (including current user):', allStudentsInSection.length);
    console.log('[CLASSMATES] Sample students:', allStudentsInSection.slice(0, 3).map(s => ({
      _id: s._id,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email,
      academicYear: s.academicYear
    })));

    // Add search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get classmates
    const classmates = await User.find(query)
      .select('firstName lastName email rollNumber profile lastLogin isActive')
      .limit(parseInt(limit))
      .sort({ 'profile.picture': -1, firstName: 1, lastName: 1 }); // Profile pictures first, then alphabetical

    console.log('[CLASSMATES] Found classmates:', classmates.length);
    console.log('[CLASSMATES] Limit applied:', parseInt(limit));
    console.log('[CLASSMATES] Classmates found:', classmates.map(c => `${c.firstName} ${c.lastName}`));

    // Get live users from Redis (with error handling)
    let activeUserIds = [];
    try {
      await connectRedis();
      const liveUserIds = await redisClient.sMembers('live_users');
      const now = Date.now();
      
      // Filter users active in last 5 minutes
      for (const id of liveUserIds) {
        const lastSeen = await redisClient.get(`user_last_seen:${id}`);
        if (lastSeen && now - Number(lastSeen) < 5 * 60 * 1000) { // 5 minutes
          activeUserIds.push(id);
        }
      }
      console.log('[CLASSMATES] Active users from Redis:', activeUserIds.length);
    } catch (redisError) {
      console.error('[CLASSMATES] Redis error:', redisError.message);
      // Continue without Redis data
    }

    // Calculate attendance statistics for each classmate
    const classmatesWithStats = await Promise.all(
      classmates.map(async (classmate) => {
        try {
          // Get attendance statistics for this student
          const attendanceStats = await Attendance.aggregate([
            {
              $match: {
                'students.studentId': classmate._id,
                // academicYear: academicYearId, // Remove this requirement
                department: departmentId,
                year: req.user.year,
                section: req.user.section
              }
            },
            {
              $unwind: '$students'
            },
            {
              $match: {
                'students.studentId': classmate._id
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                present: {
                  $sum: {
                    $cond: [
                      { $eq: ['$students.status', 'present'] },
                      1,
                      0
                    ]
                  }
                },
                absent: {
                  $sum: {
                    $cond: [
                      { $eq: ['$students.status', 'absent'] },
                      1,
                      0
                    ]
                  }
                },
                late: {
                  $sum: {
                    $cond: [
                      { $eq: ['$students.status', 'late'] },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]);

          let attendancePercentage = 0;
          if (attendanceStats.length > 0) {
            const stats = attendanceStats[0];
            const total = stats.total || 0;
            const present = stats.present || 0;
            attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
          }

          return {
            _id: classmate._id,
            firstName: classmate.firstName,
            lastName: classmate.lastName,
            email: classmate.email,
            rollNumber: classmate.rollNumber,
            profile: classmate.profile,
            lastLogin: classmate.lastLogin,
            isActive: classmate.isActive,
            isOnline: activeUserIds.includes(classmate._id.toString()),
            attendancePercentage,
            attendanceStats: attendanceStats.length > 0 ? attendanceStats[0] : {
              total: 0,
              present: 0,
              absent: 0,
              late: 0
            }
          };
        } catch (error) {
          console.error(`Error calculating attendance for student ${classmate._id}:`, error);
          return {
            _id: classmate._id,
            firstName: classmate.firstName,
            lastName: classmate.lastName,
            email: classmate.email,
            rollNumber: classmate.rollNumber,
            profile: classmate.profile,
            lastLogin: classmate.lastLogin,
            isActive: classmate.isActive,
            isOnline: activeUserIds.includes(classmate._id.toString()),
            attendancePercentage: 0,
            attendanceStats: {
              total: 0,
              present: 0,
              absent: 0,
              late: 0
            }
          };
        }
      })
    );

    // Sort by profile picture (those with custom pictures first), then by attendance percentage, then by name
    const sortedClassmates = classmatesWithStats.sort((a, b) => {
      // First priority: profile picture (custom vs default)
      const aHasCustomPicture = a.profile?.picture && 
        !a.profile.picture.includes('imgs.search.brave.com') && 
        !a.profile.picture.includes('default');
      const bHasCustomPicture = b.profile?.picture && 
        !b.profile.picture.includes('imgs.search.brave.com') && 
        !b.profile.picture.includes('default');
      
      if (aHasCustomPicture && !bHasCustomPicture) return -1;
      if (!aHasCustomPicture && bHasCustomPicture) return 1;
      
      // Second priority: online status
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      
      // Third priority: attendance percentage
      if (a.attendancePercentage !== b.attendancePercentage) {
        return b.attendancePercentage - a.attendancePercentage;
      }
      
      // Fourth priority: alphabetical by name
      const aName = `${a.firstName} ${a.lastName}`.toLowerCase();
      const bName = `${b.firstName} ${b.lastName}`.toLowerCase();
      return aName.localeCompare(bName);
    });

    console.log('[CLASSMATES] Returning', sortedClassmates.length, 'classmates');

    res.json({
      success: true,
      data: {
        classmates: sortedClassmates,
        total: sortedClassmates.length,
        userInfo: {
          section: req.user.section,
          year: req.user.year,
          department: req.user.department,
          academicYear: req.user.academicYear
        }
      }
    });

  } catch (error) {
    console.error('[CLASSMATES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classmates',
      error: error.message
    });
  }
}));

// @route   GET /api/classmates/stats
// @desc    Get aggregated statistics about classmates
// @access  Private (Student only)
router.get('/stats', [
  authenticate
], asyncHandler(async (req, res) => {
  console.log('[CLASSMATES STATS] Request received:', req.user.email, req.user.role);
  
  // Only students can access this endpoint
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can access classmates statistics'
    });
  }

  try {
    // Convert string IDs to ObjectIds for proper MongoDB querying
    const departmentId = mongoose.Types.ObjectId.isValid(req.user.department) 
      ? new mongoose.Types.ObjectId(req.user.department) 
      : req.user.department;
    
    const academicYearId = mongoose.Types.ObjectId.isValid(req.user.academicYear) 
      ? new mongoose.Types.ObjectId(req.user.academicYear) 
      : req.user.academicYear;

    // Get total classmates count
    const totalClassmates = await User.countDocuments({
      role: 'student',
      isActive: true,
      department: departmentId,
      year: req.user.year,
      section: req.user.section,
      _id: { $ne: new mongoose.Types.ObjectId(req.user._id) }
    });

    // Get online classmates count
    let onlineClassmates = 0;
    try {
      await connectRedis();
      const liveUserIds = await redisClient.sMembers('live_users');
      const now = Date.now();
      const activeUserIds = [];
      
      for (const id of liveUserIds) {
        const lastSeen = await redisClient.get(`user_last_seen:${id}`);
        if (lastSeen && now - Number(lastSeen) < 5 * 60 * 1000) {
          activeUserIds.push(id);
        }
      }

      onlineClassmates = await User.countDocuments({
        role: 'student',
        isActive: true,
        department: departmentId,
        year: req.user.year,
        section: req.user.section,
        _id: { $ne: new mongoose.Types.ObjectId(req.user._id), $in: activeUserIds }
      });
    } catch (redisError) {
      console.error('[CLASSMATES STATS] Redis error:', redisError.message);
      // Continue without Redis data
    }

    // Get attendance statistics for the section
    const sectionAttendanceStats = await Attendance.aggregate([
      {
        $match: {
          department: departmentId,
          year: req.user.year,
          section: req.user.section
        }
      },
      {
        $unwind: '$students'
      },
      {
        $group: {
          _id: '$students.studentId',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'present'] },
                1,
                0
              ]
            }
          },
          absent: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'absent'] },
                1,
                0
              ]
            }
          },
          late: {
            $sum: {
              $cond: [
                { $eq: ['$students.status', 'late'] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          avgAttendance: { $avg: { $divide: ['$present', '$total'] } },
          totalStudents: { $sum: 1 },
          highAttendance: {
            $sum: {
              $cond: [
                { $gte: [{ $divide: ['$present', '$total'] }, 0.9] },
                1,
                0
              ]
            }
          },
          lowAttendance: {
            $sum: {
              $cond: [
                { $lt: [{ $divide: ['$present', '$total'] }, 0.75] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = sectionAttendanceStats.length > 0 ? sectionAttendanceStats[0] : {
      avgAttendance: 0,
      totalStudents: 0,
      highAttendance: 0,
      lowAttendance: 0
    };

    console.log('[CLASSMATES STATS] Returning stats:', { totalClassmates, onlineClassmates });

    res.json({
      success: true,
      data: {
        totalClassmates,
        onlineClassmates,
        sectionStats: {
          averageAttendance: Math.round((stats.avgAttendance || 0) * 100),
          highAttendanceStudents: stats.highAttendance || 0,
          lowAttendanceStudents: stats.lowAttendance || 0,
          totalStudentsWithAttendance: stats.totalStudents || 0
        }
      }
    });

  } catch (error) {
    console.error('[CLASSMATES STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch classmates statistics',
      error: error.message
    });
  }
}));

// @route   GET /api/classmates/favourites
// @desc    Get user's favourite classmates
// @access  Private (Student only)
router.get('/favourites', [
  authenticate
], asyncHandler(async (req, res) => {
  console.log('[CLASSMATES FAVOURITES] Request received:', req.user.email, req.user.role);
  
  // Only students can access this endpoint
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can access favourites'
    });
  }

  try {
    // Get user's favourites from database
    const user = await User.findById(req.user._id).select('favouriteClassmates');
    const favourites = user?.favouriteClassmates || [];

    res.json({
      success: true,
      data: {
        favourites
      }
    });

  } catch (error) {
    console.error('[CLASSMATES FAVOURITES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favourites',
      error: error.message
    });
  }
}));

// @route   POST /api/classmates/favourites
// @desc    Add or remove a classmate from favourites
// @access  Private (Student only)
router.post('/favourites', [
  authenticate,
  body('classmateId').isMongoId().withMessage('Valid classmate ID is required')
], asyncHandler(async (req, res) => {
  console.log('[CLASSMATES FAVOURITES] Toggle request received:', req.user.email, req.body.classmateId);
  
  // Only students can access this endpoint
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can manage favourites'
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

  try {
    const { classmateId } = req.body;

    // Get current user with favourites
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize favourites array if it doesn't exist
    if (!user.favouriteClassmates) {
      user.favouriteClassmates = [];
    }

    // Toggle favourite
    const isFavourite = user.favouriteClassmates.includes(classmateId);
    if (isFavourite) {
      // Remove from favourites
      user.favouriteClassmates = user.favouriteClassmates.filter(id => id.toString() !== classmateId);
    } else {
      // Add to favourites
      user.favouriteClassmates.push(classmateId);
    }

    await user.save();

    res.json({
      success: true,
      data: {
        favourites: user.favouriteClassmates,
        isFavourite: !isFavourite,
        message: isFavourite ? 'Removed from favourites' : 'Added to favourites'
      }
    });

  } catch (error) {
    console.error('[CLASSMATES FAVOURITES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update favourites',
      error: error.message
    });
  }
}));

module.exports = router; 