const cron = require('node-cron');
const ClassReminderService = require('../services/classReminderService');

// Run every minute to check for upcoming classes
const classReminderJob = cron.schedule('* * * * *', async () => {
  try {
    console.log('[CLASS REMINDER CRON] Running class reminder check...');
    
    // Send notifications for upcoming classes
    await ClassReminderService.sendUpcomingClassNotifications();
    
  } catch (error) {
    console.error('[CLASS REMINDER CRON] Error in class reminder job:', error);
  }
});

// Run daily at 12:00 AM to generate new reminders for all students
const generateRemindersJob = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('[CLASS REMINDER CRON] Generating reminders for all students...');
    
    // Generate reminders for all students
    await ClassReminderService.generateRemindersForAllStudents();
    
    // Clean up old reminders
    await ClassReminderService.cleanupOldReminders();
    
  } catch (error) {
    console.error('[CLASS REMINDER CRON] Error in generate reminders job:', error);
  }
});

// Run weekly on Sunday at 1:00 AM to regenerate all reminders
const weeklyRemindersJob = cron.schedule('0 1 * * 0', async () => {
  try {
    console.log('[CLASS REMINDER CRON] Weekly reminder regeneration...');
    
    // Generate reminders for all students
    await ClassReminderService.generateRemindersForAllStudents();
    
  } catch (error) {
    console.error('[CLASS REMINDER CRON] Error in weekly reminders job:', error);
  }
});

// Start all jobs
const startClassReminderJobs = () => {
  classReminderJob.start();
  generateRemindersJob.start();
  weeklyRemindersJob.start();
  console.log('[CLASS REMINDER CRON] All class reminder jobs started');
};

// Stop all jobs
const stopClassReminderJobs = () => {
  classReminderJob.stop();
  generateRemindersJob.stop();
  weeklyRemindersJob.stop();
  console.log('[CLASS REMINDER CRON] All class reminder jobs stopped');
};

module.exports = {
  startClassReminderJobs,
  stopClassReminderJobs
}; 