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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: [true, 'Subject is required']
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
  
  // New fields for assignment management
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: [true, 'Academic year is required']
  },
  year: {
    type: Number,
    enum: [2, 3, 4],
    required: [true, 'Year is required']
  },
  semester: {
    type: Number,
    required: [true, 'Semester is required'],
    enum: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  assignmentNumber: {
    type: Number,
    required: [true, 'Assignment number is required'],
    enum: [1, 2, 3],
    validate: {
      validator: async function(value) {
        // Skip validation if this is a new document
        if (this.isNew) {
          const existing = await this.constructor.findOne({
            subject: this.subject,
            sections: { $in: this.sections },
            year: this.year,
            semester: this.semester,
            academicYear: this.academicYear,
            assignmentNumber: value,
            isActive: true
          });
          return !existing;
        }
        return true;
      },
      message: 'Assignment number already exists for this subject and class'
    }
  },
  assignedDate: {
    type: Date,
    required: [true, 'Assigned date is required']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  
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
    required: [true, 'Due date is required']
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
  
  // Marks for students
  marks: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    marks: {
      type: Number,
      min: 0,
      max: 10,
      default: null
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes
assignmentSchema.index({ teacher: 1 });
assignmentSchema.index({ department: 1 });
assignmentSchema.index({ sections: 1 });
assignmentSchema.index({ dueDate: 1 });
assignmentSchema.index({ type: 1 });
assignmentSchema.index({ academicYear: 1 });
assignmentSchema.index({ year: 1 });
assignmentSchema.index({ semester: 1 });
assignmentSchema.index({ subject: 1, sections: 1, year: 1, semester: 1, academicYear: 1, assignmentNumber: 1 });

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

// Static method to check if assignment number exists
assignmentSchema.statics.checkAssignmentNumber = function(data) {
  return this.findOne({
    subject: data.subject,
    sections: { $in: data.sections },
    year: data.year,
    semester: data.semester,
    academicYear: data.academicYear,
    assignmentNumber: data.assignmentNumber,
    isActive: true
  });
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