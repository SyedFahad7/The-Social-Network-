// Load models in the correct order to avoid circular dependencies
// Department must be loaded before User since User references Department

require('./Department');
require('./AcademicYear');
require('./User');
require('./Subject');
require('./Section');
require('./Assignment');
require('./Attendance');
require('./Certificate');
require('./Feedback');
require('./Notification');
require('./UserNotification');
require('./Test');
require('./Timetable');
require('./ClassReminder');

// Export all models
module.exports = {
  Department: require('./Department'),
  AcademicYear: require('./AcademicYear'),
  User: require('./User'),
  Subject: require('./Subject'),
  Section: require('./Section'),
  Assignment: require('./Assignment'),
  Attendance: require('./Attendance'),
  Certificate: require('./Certificate'),
  Feedback: require('./Feedback').Feedback,
  FeedbackResponse: require('./Feedback').FeedbackResponse,
  Notification: require('./Notification'),
  UserNotification: require('./UserNotification'),
  Test: require('./Test'),
  Timetable: require('./Timetable'),
  ClassReminder: require('./ClassReminder')
}; 