const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(v) {
        // Date should not be in the future
        return v <= new Date();
      },
      message: 'Attendance date cannot be in the future'
    }
  },
  
  // Class Information
  classType: {
    type: String,
    enum: ['lecture', 'lab', 'tutorial'],
    default: 'lecture'
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  
  // Attendance Records
  attendanceRecords: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      required: true
    },
    markedAt: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      default: null
    }
  }],
  
  // Summary
  totalStudents: {
    type: Number,
    required: true
  },
  presentCount: {
    type: Number,
    default: 0
  },
  absentCount: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  
  // Status
  isFinalized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
attendanceSchema.index({ teacher: 1 });
attendanceSchema.index({ section: 1 });
attendanceSchema.index({ department: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ 'attendanceRecords.student': 1 });

// Compound index for unique attendance per day per section per subject
attendanceSchema.index({ 
  teacher: 1, 
  section: 1, 
  subject: 1, 
  date: 1 
}, { unique: true });

// Pre-save middleware to calculate summary
attendanceSchema.pre('save', function(next) {
  this.presentCount = this.attendanceRecords.filter(record => record.status === 'present').length;
  this.absentCount = this.attendanceRecords.filter(record => record.status === 'absent').length;
  this.lateCount = this.attendanceRecords.filter(record => record.status === 'late').length;
  this.totalStudents = this.attendanceRecords.length;
  next();
});

// Method to mark student attendance
attendanceSchema.methods.markAttendance = function(studentId, status, remarks = null) {
  const existingRecord = this.attendanceRecords.find(
    record => record.student.toString() === studentId.toString()
  );
  
  if (existingRecord) {
    existingRecord.status = status;
    existingRecord.remarks = remarks;
    existingRecord.markedAt = new Date();
  } else {
    this.attendanceRecords.push({
      student: studentId,
      status,
      remarks,
      markedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to bulk mark attendance
attendanceSchema.methods.bulkMarkAttendance = function(attendanceData) {
  attendanceData.forEach(({ studentId, status, remarks }) => {
    const existingRecord = this.attendanceRecords.find(
      record => record.student.toString() === studentId.toString()
    );
    
    if (existingRecord) {
      existingRecord.status = status;
      existingRecord.remarks = remarks;
      existingRecord.markedAt = new Date();
    } else {
      this.attendanceRecords.push({
        student: studentId,
        status,
        remarks,
        markedAt: new Date()
      });
    }
  });
  
  return this.save();
};

// Static method to get attendance for student
attendanceSchema.statics.getStudentAttendance = function(studentId, startDate = null, endDate = null) {
  const query = {
    'attendanceRecords.student': studentId
  };
  
  if (startDate && endDate) {
    query.date = { $gte: startDate, $lte: endDate };
  }
  
  return this.find(query)
    .populate('teacher', 'firstName lastName')
    .select('subject subjectCode date classType attendanceRecords.$');
};

// Static method to get attendance statistics for student
attendanceSchema.statics.getStudentAttendanceStats = async function(studentId) {
  const pipeline = [
    { $unwind: '$attendanceRecords' },
    { $match: { 'attendanceRecords.student': mongoose.Types.ObjectId(studentId) } },
    {
      $group: {
        _id: '$subject',
        totalClasses: { $sum: 1 },
        presentClasses: {
          $sum: {
            $cond: [
              { $eq: ['$attendanceRecords.status', 'present'] },
              1,
              0
            ]
          }
        },
        lateClasses: {
          $sum: {
            $cond: [
              { $eq: ['$attendanceRecords.status', 'late'] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        subject: '$_id',
        totalClasses: 1,
        presentClasses: 1,
        lateClasses: 1,
        attendancePercentage: {
          $multiply: [
            { $divide: ['$presentClasses', '$totalClasses'] },
            100
          ]
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Attendance', attendanceSchema);