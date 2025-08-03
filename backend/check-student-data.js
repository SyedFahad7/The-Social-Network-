const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const User = require('./models/User');

async function checkStudentData() {
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

    console.log('Student data from database:');
    console.log(JSON.stringify(student.toObject(), null, 2));

    // Check if academicYear field exists
    console.log('\nChecking for academicYear field:');
    console.log('Has academicYear property:', 'academicYear' in student);
    console.log('academicYear value:', student.academicYear);
    console.log('academicYear type:', typeof student.academicYear);

    // Check all properties
    console.log('\nAll student properties:');
    Object.keys(student.toObject()).forEach(key => {
      console.log(`${key}: ${typeof student[key]} = ${JSON.stringify(student[key])}`);
    });

  } catch (error) {
    console.error('Error checking student data:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkStudentData(); 