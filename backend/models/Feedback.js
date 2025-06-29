const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Feedback title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Feedback Configuration
  feedbackType: {
    type: String,
    enum: ['teacher-evaluation', 'course-feedback', 'general-feedback', 'suggestion'],
    default: 'teacher-evaluation'
  },
  targetRole: {
    type: String,
    enum: ['student', 'teacher', 'all'],
    default: 'student'
  },
  
  // Target Filters
  departments: [{
    type: String,
    enum: ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering']
  }],
  sections: [{
    type: String,
    enum: ['A', 'B', 'C']
  }],
  semesters: [{
    type: Number,
    min: 1,
    max: 8
  }],
  
  // Questions
  questions: [{
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters']
    },
    questionType: {
      type: String,
      enum: ['multiple-choice', 'rating', 'text', 'yes-no'],
      required: [true, 'Question type is required']
    },
    options: [{
      type: String,
      trim: true
    }], // For multiple-choice questions
    isRequired: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      required: true
    }
  }],
  
  // Schedule
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(v) {
        return v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  
  // Settings
  isAnonymous: {
    type: Boolean,
    default: true
  },
  allowMultipleSubmissions: {
    type: Boolean,
    default: false
  },
  showResults: {
    type: Boolean,
    default: false
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'closed', 'archived'],
    default: 'draft'
  },
  
  // Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  
  // Statistics
  totalResponses: {
    type: Number,
    default: 0
  },
  targetAudience: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Response Schema
const responseSchema = new mongoose.Schema({
  feedback: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Feedback',
    required: [true, 'Feedback reference is required']
  },
  respondent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Respondent is required']
  },
  
  // Responses
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: {
      type: mongoose.Schema.Mixed, // Can be string, number, array, etc.
      required: true
    }
  }],
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for Feedback
feedbackSchema.index({ createdBy: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ startDate: 1, endDate: 1 });
feedbackSchema.index({ feedbackType: 1 });

// Indexes for Response
responseSchema.index({ feedback: 1 });
responseSchema.index({ respondent: 1 });
responseSchema.index({ feedback: 1, respondent: 1 }, { unique: true }); // Prevent duplicate responses

// Virtual to check if feedback is currently active
feedbackSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startDate <= now && 
         this.endDate >= now;
});

// Method to activate feedback
feedbackSchema.methods.activate = function() {
  this.status = 'active';
  return this.save();
};

// Method to close feedback
feedbackSchema.methods.close = function() {
  this.status = 'closed';
  return this.save();
};

// Static method to get active feedbacks for user
feedbackSchema.statics.getActiveForUser = function(user) {
  const now = new Date();
  const query = {
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now }
  };
  
  // Filter by role
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    query.targetRole = { $in: [user.role, 'all'] };
  }
  
  // Filter by department
  query.$or = [
    { departments: { $size: 0 } }, // No department filter
    { departments: { $in: [user.department] } }
  ];
  
  // Filter by section (for students)
  if (user.role === 'student' && user.section) {
    query.$and = [
      {
        $or: [
          { sections: { $size: 0 } }, // No section filter
          { sections: { $in: [user.section] } }
        ]
      }
    ];
  }
  
  return this.find(query).populate('createdBy', 'firstName lastName');
};

// Static method to get feedback statistics
feedbackSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    draft: 0,
    active: 0,
    closed: 0,
    archived: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    result[stat._id] = stat.count;
  });
  
  return result;
};

const Feedback = mongoose.model('Feedback', feedbackSchema);
const FeedbackResponse = mongoose.model('FeedbackResponse', responseSchema);

module.exports = { Feedback, FeedbackResponse };