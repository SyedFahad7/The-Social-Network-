const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Department code is required'],
    uppercase: true,
    trim: true,
    maxlength: [10, 'Department code cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  totalTeachers: {
    type: Number,
    default: 0
  },
  totalAdmins: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      return ret;
    }
  }
});

// Indexes for better performance
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ isActive: 1 });

// Static method to get all active departments
departmentSchema.statics.getActiveDepartments = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get department statistics
departmentSchema.statics.getDepartmentStats = async function() {
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $group: {
        _id: null,
        totalDepartments: { $sum: 1 },
        totalStudents: { $sum: '$totalStudents' },
        totalTeachers: { $sum: '$totalTeachers' },
        totalAdmins: { $sum: '$totalAdmins' }
      }
    }
  ]);
  
  return stats[0] || {
    totalDepartments: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0
  };
};

module.exports = mongoose.model('Department', departmentSchema); 