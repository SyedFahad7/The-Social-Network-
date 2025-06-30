const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs'); // Removed - no longer using bcrypt

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['student', 'teacher', 'admin', 'super-admin'],
      message: 'Role must be student, teacher, admin, or super-admin'
    }
  },
  department: {
    type: mongoose.Schema.Types.ObjectId, // Change from String to ObjectId
    ref: 'Department',
    required: [true, 'Department is required'],
    validate: {
      validator: async function (v) {
        try {
          const Department = mongoose.model('Department');
          const department = await Department.findById(v);
          return department && department.isActive;
        } catch (err) {
          return false;
        }
      },
      message: 'Please select a valid department'
    }
  },
  

  
  // Student-specific fields
  rollNumber: {
    type: String,
    sparse: true, // Allows null values but ensures uniqueness when present
    unique: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Only validate if user is a student
        if (this.role === 'student') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Roll number is required for students'
    }
  },
  section: {
    type: String,
    enum: {
      values: ['A', 'B', 'C'],
      message: 'Section must be A, B, or C'
    },
    validate: {
      validator: function(v) {
        // Only validate if user is a student
        if (this.role === 'student') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Section is required for students'
    }
  },
  
  // Teacher-specific fields
  employeeId: {
    type: String,
    sparse: true,
    unique: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Only validate if user is a teacher
        if (this.role === 'teacher') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Employee ID is required for teachers'
    }
  },
  
  // Profile Information
  profilePicture: {
    type: String, // URL to image
    default: null
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Email Change Process
  pendingEmail: {
    type: String,
    default: null
  },
  emailChangeOTP: {
    type: String,
    default: null
  },
  emailChangeOTPExpires: {
    type: Date,
    default: null
  },
  
  // Password Reset
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  
  // Timestamps
  lastLogin: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailChangeOTP;
      delete ret.resetPasswordToken;
      return ret;
    }
  }
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ rollNumber: 1 }, { sparse: true });
userSchema.index({ employeeId: 1 }, { sparse: true });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to compare password - Plain text comparison
userSchema.methods.comparePassword = async function(candidatePassword) {
  return this.password === candidatePassword;
};

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to generate email change OTP
userSchema.methods.createEmailChangeOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailChangeOTP = otp;
  this.emailChangeOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = {
    total: 0,
    students: 0,
    teachers: 0,
    admins: 0,
    superAdmins: 0
  };
  
  stats.forEach(stat => {
    result.total += stat.count;
    switch(stat._id) {
      case 'student':
        result.students = stat.count;
        break;
      case 'teacher':
        result.teachers = stat.count;
        break;
      case 'admin':
        result.admins = stat.count;
        break;
      case 'super-admin':
        result.superAdmins = stat.count;
        break;
    }
  });
  
  return result;
};

module.exports = mongoose.model('User', userSchema);