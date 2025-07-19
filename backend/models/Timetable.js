const mongoose = require('mongoose');

const TimetableSlotSchema = new mongoose.Schema({
  hour: { type: Number, required: true }, // 1-6
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: false },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  type: { type: String, enum: ['lecture', 'lab', 'special'], default: 'lecture', required: true },
  label: { type: String, required: function() { return this.type === 'special'; } } // For special slots like lunch, NAMAZ, R&D
});

const TimetableSchema = new mongoose.Schema({
  section: { type: String, required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  days: {
    monday: [TimetableSlotSchema],
    tuesday: [TimetableSlotSchema],
    wednesday: [TimetableSlotSchema],
    thursday: [TimetableSlotSchema],
    friday: [TimetableSlotSchema],
    saturday: [TimetableSlotSchema]
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);