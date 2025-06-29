const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    enum: ['A', 'B', 'C']
  },
  department: {
    type: String,
    required: [true, 'Department is required']
  },
  
  // Schedule Information
  dayOfWeek: {
    type: String,
    required: [true, 'Day of week is required'],
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide time in HH:MM format']
  },
  
  // Class Details
  classType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial'],
    default: 'lecture'
  },
  room: {
    type: String,
    required: [true, 'Room is required'],
    trim: true
  },
  
  // Semester and Academic Year
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    min: 1,
    max: 8
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
timetableSchema.index({ teacher: 1 });
timetableSchema.index({ section: 1 });
timetableSchema.index({ department: 1 });
timetableSchema.index({ dayOfWeek: 1 });
timetableSchema.index({ academicYear: 1, semester: 1 });

// Compound index to prevent scheduling conflicts
timetableSchema.index({ 
  section: 1, 
  dayOfWeek: 1, 
  startTime: 1, 
  endTime: 1,
  academicYear: 1,
  semester: 1
});

// Validation to ensure end time is after start time
timetableSchema.pre('save', function(next) {
  const startHour = parseInt(this.startTime.split(':')[0]);
  const startMinute = parseInt(this.startTime.split(':')[1]);
  const endHour = parseInt(this.endTime.split(':')[0]);
  const endMinute = parseInt(this.endTime.split(':')[1]);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  if (endTotalMinutes <= startTotalMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Static method to get timetable for section
timetableSchema.statics.getForSection = function(section, department, academicYear, semester) {
  return this.find({
    section,
    department,
    academicYear,
    semester,
    isActive: true
  })
  .populate('teacher', 'firstName lastName email')
  .sort({ dayOfWeek: 1, startTime: 1 });
};

// Static method to get timetable for teacher
timetableSchema.statics.getForTeacher = function(teacherId, academicYear, semester) {
  return this.find({
    teacher: teacherId,
    academicYear,
    semester,
    isActive: true
  })
  .sort({ dayOfWeek: 1, startTime: 1 });
};

// Method to check for conflicts
timetableSchema.statics.checkConflict = async function(section, dayOfWeek, startTime, endTime, academicYear, semester, excludeId = null) {
  const query = {
    section,
    dayOfWeek,
    academicYear,
    semester,
    isActive: true,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const conflicts = await this.find(query);
  return conflicts.length > 0;
};

module.exports = mongoose.model('Timetable', timetableSchema);