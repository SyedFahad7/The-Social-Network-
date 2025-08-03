const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import models
const User = require('./models/User');
const Department = require('./models/Department');

async function reverseStudentAcademicYear() {
  try {
    // Find the student by email
    const student = await User.findOne({ 
      email: '160922750158@lords.ac.in',
      role: 'student'
    });

    if (!student) {
      console.log('Student not found');
      return;
    }

    console.log('Found student:', {
      id: student._id,
      email: student.email,
      section: student.section,
      year: student.year,
      currentSemester: student.currentSemester,
      semesterHistory: student.semesterHistory
    });

    // Remove the semester history entry we added
    const result = await User.updateOne(
      { _id: student._id },
      { $pull: { semesterHistory: { 
        academicYear: '6867050340150fc76c1cf688',
        semester: 7,
        year: 4,
        section: 'C'
      }}}
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Removed semester history entry');
    } else {
      console.log('ℹ️ No semester history entry to remove');
    }

    // Fetch updated student to show the result
    const updatedStudent = await User.findById(student._id);
    console.log('Updated student semester history:', updatedStudent.semesterHistory);

  } catch (error) {
    console.error('Error reversing student academic year:', error);
  } finally {
    mongoose.connection.close();
  }
}

reverseStudentAcademicYear(); 