const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
  type: {
    type: String,
    required: [true, 'Assignment type is required'],
    enum: {
      values: ['assignment', 'test'],
      message: 'Type must be assignment or test'
    }
  },
  
  // Teacher and Section Information
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher is required']
  },
  department: {
    type: String,
    required: [true, 'Department is required']
  },
  sections: [{
    type: String,
    enum: ['A', 'B', 'C'],
    required: true
  }],
  
  // File Information
  fileUrl: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: null
  },
  fileSize: {
    type: Number,
    default: null
  },
  
  // Dates
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  
  // Submission tracking
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    grade: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    feedback: {
      type: String,
      default: null
    },
    hasSubmitted: {
      type: Boolean,
      default: false
    }
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  year: {
    type: Number,
    enum: [2, 3, 4],
    required: true
  }
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ department: 1 });
assignmentSchema.index({ sections: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ type: 1 });

// Virtual for submission count
assignmentSchema.virtual('submissionCount').get(function() {
  return this.submissions.filter(sub => sub.hasSubmitted).length;
});

// Method to add submission
assignmentSchema.methods.addSubmission = function(studentId, hasSubmitted = true, grade = null) {
  const existingSubmission = this.submissions.find(
    sub => sub.student.toString() === studentId.toString()
  );
  
  if (existingSubmission) {
    existingSubmission.hasSubmitted = hasSubmitted;
    if (grade !== null) existingSubmission.grade = grade;
    existingSubmission.submittedAt = new Date();
  } else {
    this.submissions.push({
      student: studentId,
      hasSubmitted,
      grade,
      submittedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to update grade
assignmentSchema.methods.updateGrade = function(studentId, grade, feedback = null) {
  const submission = this.submissions.find(
    sub => sub.student.toString() === studentId.toString()
  );
  
  if (submission) {
    submission.grade = grade;
    if (feedback) submission.feedback = feedback;
    return this.save();
  }
  
  throw new Error('Submission not found');
};

// Static method to get assignments for student
assignmentSchema.statics.getForStudent = function(studentSection, department) {
  return this.find({
    sections: { $in: [studentSection] },
    department: department,
    isActive: true,
    dueDate: { $gte: new Date() }
  }).populate('teacher', 'firstName lastName email');
};

// Static method to get assignments for teacher
assignmentSchema.statics.getForTeacher = function(teacherId) {
  return this.find({
    teacher: teacherId,
    isActive: true
  }).populate('submissions.student', 'firstName lastName rollNumber');
};

module.exports = mongoose.model('Assignment', assignmentSchema);