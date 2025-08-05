const mongoose = require('mongoose');

const dailyAttendanceSummarySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // ISO date string (YYYY-MM-DD)
    required: true
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  // Daily attendance summary
  totalHours: {
    type: Number,
    default: 6 // Assuming 6 hours per day
  },
  attendedHours: {
    type: Number,
    default: 0
  },
  absentHours: {
    type: Number,
    default: 0
  },
  notMarkedHours: {
    type: Number,
    default: 6 // Initially all hours are not marked
  },
  // Attendance details by hour
  hourlyAttendance: [
    {
      hour: { type: Number, required: true },
      status: { type: String, enum: ['present', 'absent', 'not_marked'], default: 'not_marked' },
      subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
      markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      markedAt: { type: Date }
    }
  ],
  // Streak information
  fullDayAttendance: {
    type: Boolean,
    default: false
  },
  streakCount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
dailyAttendanceSummarySchema.index({ studentId: 1, date: 1 }, { unique: true });
dailyAttendanceSummarySchema.index({ studentId: 1, academicYear: 1, date: 1 });

// Static method to calculate or update daily attendance
dailyAttendanceSummarySchema.statics.calculateDailyAttendance = async function(studentId, date) {
  const Attendance = require('./Attendance');
  
  // Get all attendance records for this student on this date
  const attendanceRecords = await Attendance.find({
    date: date,
    'students.studentId': studentId
  }).populate('subject markedBy');

  // Initialize hourly attendance array
  const hourlyAttendance = [];
  for (let hour = 1; hour <= 6; hour++) {
    hourlyAttendance.push({
      hour: hour,
      status: 'not_marked',
      subject: null,
      markedBy: null,
      markedAt: null
    });
  }

  // Fill in marked attendance
  attendanceRecords.forEach(record => {
    const studentRecord = record.students.find(s => s.studentId.toString() === studentId.toString());
    if (studentRecord && record.hour >= 1 && record.hour <= 6) {
      hourlyAttendance[record.hour - 1] = {
        hour: record.hour,
        status: studentRecord.status,
        subject: record.subject,
        markedBy: record.markedBy,
        markedAt: record.lastEditedAt
      };
    }
  });

  // Calculate summary
  const attendedHours = hourlyAttendance.filter(h => h.status === 'present').length;
  const absentHours = hourlyAttendance.filter(h => h.status === 'absent').length;
  const notMarkedHours = hourlyAttendance.filter(h => h.status === 'not_marked').length;
  const fullDayAttendance = attendedHours === 6;

  // Get student info for the summary
  const User = require('./User');
  const student = await User.findById(studentId);
  
  if (!student) {
    throw new Error('Student not found');
  }

  // Create or update daily summary
  const summary = await this.findOneAndUpdate(
    { studentId, date },
    {
      academicYear: student.academicYear,
      department: student.department,
      year: student.year,
      semester: student.semester,
      section: student.section,
      totalHours: 6,
      attendedHours,
      absentHours,
      notMarkedHours,
      hourlyAttendance,
      fullDayAttendance,
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );

  return summary;
};

// Static method to calculate study streak
dailyAttendanceSummarySchema.statics.calculateStudyStreak = async function(studentId) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's attendance summary
  let todaySummary = await this.findOne({ studentId, date: today });
  
  // If today's summary doesn't exist or is not complete, calculate it
  if (!todaySummary || todaySummary.notMarkedHours > 0) {
    todaySummary = await this.calculateDailyAttendance(studentId, today);
  }

  // If today has full attendance, check previous days
  if (todaySummary.fullDayAttendance) {
    let streak = 1; // Start with today
    
    // Check previous 7 days for full attendance
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const previousSummary = await this.findOne({ studentId, date: dateStr });
      
      if (previousSummary && previousSummary.fullDayAttendance) {
        streak++;
      } else {
        // If no record exists or no full attendance, check if we can calculate it
        if (!previousSummary) {
          // Try to calculate attendance for this date
          try {
            const calculatedSummary = await this.calculateDailyAttendance(studentId, dateStr);
            if (calculatedSummary.fullDayAttendance) {
              streak++;
            } else {
              break; // No full attendance, break the streak
            }
          } catch (error) {
            // If calculation fails, assume no attendance
            break;
          }
        } else {
          break; // No full attendance, break the streak
        }
      }
    }
    
    return streak;
  } else {
    // Today doesn't have full attendance, check if we can find a recent streak
    let maxStreak = 0;
    
    // Check last 30 days for any streaks
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const summary = await this.findOne({ studentId, date: dateStr });
      
      if (summary && summary.fullDayAttendance) {
        // Found a day with full attendance, calculate streak from this point
        let streak = 1;
        
        for (let j = 1; j <= 7; j++) {
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - j);
          const prevDateStr = prevDate.toISOString().split('T')[0];
          
          const prevSummary = await this.findOne({ studentId, date: prevDateStr });
          
          if (prevSummary && prevSummary.fullDayAttendance) {
            streak++;
          } else {
            break;
          }
        }
        
        maxStreak = Math.max(maxStreak, streak);
      }
    }
    
    return maxStreak;
  }
};

// Static method to get attendance statistics
dailyAttendanceSummarySchema.statics.getAttendanceStats = async function(studentId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summaries = await this.find({
    studentId,
    date: {
      $gte: startDate.toISOString().split('T')[0],
      $lte: endDate.toISOString().split('T')[0]
    }
  }).sort({ date: 1 });

  const totalDays = summaries.length;
  const fullAttendanceDays = summaries.filter(s => s.fullDayAttendance).length;
  const totalHours = summaries.reduce((sum, s) => sum + s.attendedHours, 0);
  const totalPossibleHours = totalDays * 6;
  const attendancePercentage = totalPossibleHours > 0 ? (totalHours / totalPossibleHours) * 100 : 0;

  return {
    totalDays,
    fullAttendanceDays,
    totalHours,
    totalPossibleHours,
    attendancePercentage: Math.round(attendancePercentage * 10) / 10,
    summaries
  };
};

module.exports = mongoose.model('DailyAttendanceSummary', dailyAttendanceSummarySchema); 