const mongoose = require('mongoose');

const ClassReminderSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timetableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable',
    required: true
  },
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    required: true
  },
  hour: {
    type: Number,
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  classTime: {
    type: Date,
    required: true
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationSentAt: {
    type: Date
  },
  message: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
ClassReminderSchema.index({ studentId: 1, classTime: 1 });
ClassReminderSchema.index({ notificationSent: 1, classTime: 1 });

module.exports = mongoose.model('ClassReminder', ClassReminderSchema); 