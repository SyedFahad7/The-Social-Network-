const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  yearLabel: {
    type: String,
    required: true,
    unique: true // e.g., '2025-26'
  },
  currentSemesterMap: {
    type: Map,
    of: Number, // e.g., { '2nd': 3, '3rd': 5 }
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AcademicYear', academicYearSchema); 