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
      'Participation',
      'Achievement', 
      'Recognition',
      'Workshop',
      'Award',
      'Appreciation',
      'Internship',
      'Extra-curricular',
      'Course Completion',
      'Certification',
      'Project',
      'Competition',
      'Leadership',
      'Volunteer',
      'Research',
      'Publication',
      'Training',
      'Conference',
      'Seminar',
      'Bootcamp',
      'Hackathon',
      'Scholarship',
      'Honor',
      'Distinction',
      'Merit',
      'Excellence',
      'Innovation',
      'Creativity',
      'Teamwork',
      'Communication',
      'Problem Solving',
      'Critical Thinking',
      'Leadership',
      'Mentorship',
      'Community Service',
      'Social Impact',
      'Environmental',
      'Cultural',
      'Sports',
      'Arts',
      'Music',
      'Drama',
      'Debate',
      'Public Speaking',
      'Writing',
      'Photography',
      'Design',
      'Technology',
      'Programming',
      'Data Science',
      'AI/ML',
      'Cybersecurity',
      'Cloud Computing',
      'Mobile Development',
      'Web Development',
      'Game Development',
      'Blockchain',
      'IoT',
      'Robotics',
      'Other'
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
  
  // LinkedIn-style additional fields
  skills: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  duration: {
    type: String, // e.g., "3 months", "6 weeks", "1 year"
    trim: true
  },
  grade: {
    type: String, // e.g., "A+", "95%", "Distinction"
    trim: true
  },
  verificationCode: {
    type: String,
    trim: true
  },
  externalUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (v) {
          return /^https?:\/\/.+/.test(v);
        }
        return true;
      },
      message: 'External URL must be a valid HTTP/HTTPS URL'
    }
  },
  
  // Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPublic: {
    type: Boolean,
    default: true // Changed to true for LinkedIn-style public sharing
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  
  // Social Features
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  commentsCount: {
    type: Number,
    default: 0
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

// Static method to get department feed (all students in department)
certificateSchema.statics.getDepartmentFeed = async function(departmentId, page = 1, limit = 10, certificateType = null) {
  const skip = (page - 1) * limit;
  const matchQuery = {
    status: 'approved',
    isPublic: true
  };
  
  if (certificateType) {
    matchQuery.certificateType = certificateType;
  }
  
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: '$studentInfo'
    },
    {
      $match: {
        'studentInfo.department': departmentId,
        ...matchQuery
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        title: 1,
        description: 1,
        issuer: 1,
        certificateType: 1,
        category: 1,
        issueDate: 1,
        fileUrl: 1,
        skills: 1,
        duration: 1,
        grade: 1,
        externalUrl: 1,
        isVerified: 1,
        createdAt: 1,
        likes: 1,
        likesCount: 1,
        comments: 1,
        commentsCount: 1,
        student: {
          _id: '$studentInfo._id',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          rollNumber: '$studentInfo.rollNumber',
          year: '$studentInfo.year',
          section: '$studentInfo.section',
          profilePicture: '$studentInfo.profilePicture'
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get year feed (students in same year)
certificateSchema.statics.getYearFeed = async function(departmentId, year, page = 1, limit = 10, certificateType = null) {
  const skip = (page - 1) * limit;
  const matchQuery = {
    status: 'approved',
    isPublic: true
  };
  
  if (certificateType) {
    matchQuery.certificateType = certificateType;
  }
  
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: '$studentInfo'
    },
    {
      $match: {
        'studentInfo.department': departmentId,
        'studentInfo.year': year,
        ...matchQuery
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        title: 1,
        description: 1,
        issuer: 1,
        certificateType: 1,
        category: 1,
        issueDate: 1,
        fileUrl: 1,
        skills: 1,
        duration: 1,
        grade: 1,
        externalUrl: 1,
        isVerified: 1,
        createdAt: 1,
        likes: 1,
        likesCount: 1,
        comments: 1,
        commentsCount: 1,
        student: {
          _id: '$studentInfo._id',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          rollNumber: '$studentInfo.rollNumber',
          year: '$studentInfo.year',
          section: '$studentInfo.section',
          profilePicture: '$studentInfo.profilePicture'
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Static method to get class feed (students in same section)
certificateSchema.statics.getClassFeed = async function(departmentId, year, section, page = 1, limit = 10, certificateType = null) {
  const skip = (page - 1) * limit;
  const matchQuery = {
    status: 'approved',
    isPublic: true
  };
  
  if (certificateType) {
    matchQuery.certificateType = certificateType;
  }
  
  const pipeline = [
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: '$studentInfo'
    },
    {
      $match: {
        'studentInfo.department': departmentId,
        'studentInfo.year': year,
        'studentInfo.section': section,
        ...matchQuery
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        title: 1,
        description: 1,
        issuer: 1,
        certificateType: 1,
        category: 1,
        issueDate: 1,
        fileUrl: 1,
        skills: 1,
        duration: 1,
        grade: 1,
        externalUrl: 1,
        isVerified: 1,
        createdAt: 1,
        likes: 1,
        likesCount: 1,
        comments: 1,
        commentsCount: 1,
        student: {
          _id: '$studentInfo._id',
          firstName: '$studentInfo.firstName',
          lastName: '$studentInfo.lastName',
          rollNumber: '$studentInfo.rollNumber',
          year: '$studentInfo.year',
          section: '$studentInfo.section',
          profilePicture: '$studentInfo.profilePicture'
        }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Like/Unlike functionality
certificateSchema.statics.likeCertificate = async function(certificateId, userId) {
  const certificate = await this.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }
  
  // Check if user already liked
  const existingLike = certificate.likes.find(like => like.user.toString() === userId.toString());
  if (existingLike) {
    throw new Error('Certificate already liked');
  }
  
  // Add like
  certificate.likes.push({ user: userId });
  certificate.likesCount = certificate.likes.length;
  
  await certificate.save();
  return certificate;
};

certificateSchema.statics.unlikeCertificate = async function(certificateId, userId) {
  const certificate = await this.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }
  
  // Remove like
  certificate.likes = certificate.likes.filter(like => like.user.toString() !== userId.toString());
  certificate.likesCount = certificate.likes.length;
  
  await certificate.save();
  return certificate;
};

certificateSchema.statics.addComment = async function(certificateId, userId, text) {
  const certificate = await this.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }
  
  certificate.comments.push({ user: userId, text });
  certificate.commentsCount = certificate.comments.length;
  
  await certificate.save();
  return certificate;
};

module.exports = mongoose.model('Certificate', certificateSchema);