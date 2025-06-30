// Load models in the correct order to avoid circular dependencies
// Department must be loaded before User since User references Department

// Load Department first
require('./Department');

// Then load User (which references Department)
require('./User');

// Load other models
require('./Assignment');
require('./Attendance');
require('./Certificate');
require('./Feedback');
require('./QuestionBank');
require('./Section');
require('./Test');
require('./Timetable');

// Export all models
module.exports = {
  Department: require('./Department'),
  User: require('./User'),
  Assignment: require('./Assignment'),
  Attendance: require('./Attendance'),
  Certificate: require('./Certificate'),
  Feedback: require('./Feedback'),
  QuestionBank: require('./QuestionBank'),
  Section: require('./Section'),
  Test: require('./Test'),
  Timetable: require('./Timetable')
}; 