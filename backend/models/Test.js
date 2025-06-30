const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attended: {
    type: Boolean,
    default: false
  },
  grade: {
    type: Number,
    min: 0,
    max: 100
  },
  submittedAt: {
    type: Date
  }
});

const testSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['midterm', 'final', 'surprise'],
    required: true
  },
  results: [testResultSchema]
}, {
  timestamps: true
});

// Index for efficient queries
testSchema.index({ sectionId: 1, date: 1 });
testSchema.index({ teacherId: 1 });
testSchema.index({ type: 1 });
testSchema.index({ 'results.studentId': 1 });

module.exports = mongoose.model('Test', testSchema); 