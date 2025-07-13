const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  maxStudents: {
    type: Number,
    default: 60
  },
  currentStudents: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  year: {
    type: Number,
    enum: [2, 3, 4],
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
sectionSchema.index({ teacherId: 1, departmentId: 1 });
sectionSchema.index({ status: 1 });

module.exports = mongoose.model('Section', sectionSchema); 