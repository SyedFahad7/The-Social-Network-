const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
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
  section: {
    type: String,
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true // Now always required
  },
  date: {
    type: String, // ISO date string
    required: true
  },
  hour: {
    type: Number,
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  students: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      status: { type: String, enum: ['present', 'absent'], required: true },
      late: { type: Boolean, default: false },
      comments: { type: String, default: '' }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  lastEditedAt: { type: Date, default: Date.now }
});

// Indexes
attendanceSchema.index({ academicYear: 1, department: 1, year: 1, semester: 1, section: 1, date: 1, hour: 1 }, { unique: true });

attendanceSchema.statics.getStudentAttendanceStats = async function(studentId) {
  const records = await this.find({ 'students.studentId': studentId });
  let present = 0, absent = 0, late = 0, not_marked = 0, total = 0;
  for (const rec of records) {
    const stu = rec.students.find(s => s.studentId.toString() === studentId.toString());
    if (stu) {
      total++;
      if (stu.status === 'present') present++;
      if (stu.status === 'absent') absent++;
      if (stu.late) late++;
    } else {
      not_marked++;
      total++;
    }
  }
  const totalPercent = total > 0 ? ((present + late) / total) * 100 : 0;
  return { present, absent, late, not_marked, total, totalPercent };
};

module.exports = mongoose.model('Attendance', attendanceSchema);