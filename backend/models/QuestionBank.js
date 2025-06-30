const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  sections: [{
    type: String,
    enum: ['A', 'B', 'C'],
    required: true
  }],
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['midterm', 'final', 'practice'],
    required: true
  },
  fileUrl: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: String,
    required: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for efficient queries
questionBankSchema.index({ teacherId: 1 });
questionBankSchema.index({ subject: 1 });
questionBankSchema.index({ type: 1 });
questionBankSchema.index({ sections: 1 });
questionBankSchema.index({ status: 1 });

module.exports = mongoose.model('QuestionBank', questionBankSchema); 