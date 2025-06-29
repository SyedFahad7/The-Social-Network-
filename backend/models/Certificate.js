const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  title: {
    type: String,
    required: [true, 'Certificate title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  issuer: {
    type: String,
    required: [true, 'Certificate issuer is required'],
    trim: true,
    maxlength: [200, 'Issuer name cannot exceed 200 characters']
  },
  
  // Certificate Details
  certificateType: {
    type: String,
    required: [true, 'Certificate type is required'],
    enum: [
      'course-completion',
      'certification',
      'achievement',
      'participation',
      'internship',
      'project',
      'competition',
      'other'
    ]
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'technical',
      'non-technical',
      'academic',
      'extracurricular',
      'professional',
      'research'
    ]
  },
  
  // Dates
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    validate: {
      validator: function(v) {
        return v <= new Date();
      },
      message: 'Issue date cannot be in the future'
    }
  },
  expiryDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        if (v) {
          return v > this.issueDate;
        }
        return true;
      },
      message: 'Expiry date must be after issue date'
    }
  },
  
  // File Information
  fileUrl: {
    type: String,
    required: [true, 'Certificate file is required']
  },
  fileName: {
    type: String,
    required: [true, 'File name is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['pdf', 'jpg', 'jpeg', 'png']
  },
  
  // Verification
  verificationId: {
    type: String,
    default: null,
    trim: true
  },
  verificationUrl: {
    type: String,
    default: null,
    trim: true
  },
  
  // Approval Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under-review'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewComments: {
    type: String,
    default: null,
    maxlength: [500, 'Review comments cannot exceed 500 characters']
  },
  
  // Points/Credits
  points: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
certificateSchema.index({ student: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ certificateType: 1 });
certificateSchema.index({ category: 1 });
certificateSchema.index({ issueDate: -1 });
certificateSchema.index({ reviewedBy: 1 });

// Virtual for certificate age
certificateSchema.virtual('ageInDays').get(function() {
  return Math.floor((new Date() - this.issueDate) / (1000 * 60 * 60 * 24));
});

// Method to approve certificate
certificateSchema.methods.approve = function(reviewerId, comments = null, points = 0) {
  this.status = 'approved';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  this.points = points;
  return this.save();
};

// Method to reject certificate
certificateSchema.methods.reject = function(reviewerId, comments) {
  this.status = 'rejected';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewComments = comments;
  return this.save();
};

// Static method to get certificates for student
certificateSchema.statics.getForStudent = function(studentId, status = null) {
  const query = { student: studentId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get pending certificates for review
certificateSchema.statics.getPendingForReview = function() {
  return this.find({ status: 'pending' })
    .populate('student', 'firstName lastName rollNumber section department')
    .sort({ createdAt: 1 });
};

// Static method to get certificate statistics
certificateSchema.statics.getStats = async function() {
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
    pending: 0,
    approved: 0,
    rejected: 0,
    underReview: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    switch(stat._id) {
      case 'pending':
        result.pending = stat.count;
        break;
      case 'approved':
        result.approved = stat.count;
        break;
      case 'rejected':
        result.rejected = stat.count;
        break;
      case 'under-review':
        result.underReview = stat.count;
        break;
    }
  });
  
  return result;
};

module.exports = mongoose.model('Certificate', certificateSchema);