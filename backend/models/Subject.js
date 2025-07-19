const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  semester: {
    type: Number,
    required: true
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  // Add type: lecture or lab
  type: {
    type: String,
    enum: ['lecture', 'lab'],
    default: 'lecture',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Subject', subjectSchema); 