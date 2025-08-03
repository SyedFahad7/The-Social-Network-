const ClassReminder = require('../models/ClassReminder');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Subject = require('../models/Subject');
const { sendPushNotificationToMultiple } = require('../lib/firebase');
const mongoose = require('mongoose');

// Fun and motivational class reminder messages
const CLASS_REMINDER_MESSAGES = [
  "🚀 Time to level up! Your {subject} class starts in 5 minutes. Ready to conquer?",
  "⚡ Quick reminder: {subject} class in 5 minutes. Your brain is about to get a workout!",
  "🎯 Class alert! {subject} starts in 5 minutes. Time to show off your knowledge!",
  "📚 5 minutes until {subject} class. Your future self will thank you for being on time!",
  "🌟 Hey there, superstar! {subject} class begins in 5 minutes. Let's make it count!",
  "💪 Time to shine! Your {subject} class starts in 5 minutes. You've got this!",
  "🎓 Class reminder: {subject} in 5 minutes. Knowledge is power, and you're about to get stronger!",
  "🚀 5 minutes until {subject} class. Time to unlock new levels of awesome!",
  "⚡ Quick heads up: {subject} class starts in 5 minutes. Your brilliance awaits!",
  "🎯 Class alert! {subject} in 5 minutes. Time to add another chapter to your success story!",
  "📚 5 minutes until {subject} class. Your brain is about to get a delicious knowledge snack!",
  "🌟 Hey there, future graduate! {subject} class begins in 5 minutes. Let's make it memorable!",
  "💪 Time to flex those brain muscles! {subject} class starts in 5 minutes. You're unstoppable!",
  "🎓 Class reminder: {subject} in 5 minutes. Every class is a step toward your dreams!",
  "🚀 5 minutes until {subject} class. Time to add another skill to your superpower collection!",
  "⚡ Quick reminder: {subject} class starts in 5 minutes. Your potential is limitless!",
  "🎯 Class alert! {subject} in 5 minutes. Time to write another page in your success story!",
  "📚 5 minutes until {subject} class. Your future self is cheering you on!",
  "🌟 Hey there, knowledge seeker! {subject} class begins in 5 minutes. Let's make it epic!",
  "💪 Time to level up your skills! {subject} class starts in 5 minutes. You're going to crush it!"
];

// Class time mapping (hour to actual time)
const CLASS_TIMES = {
  1: { start: '09:30', end: '10:30' },
  2: { start: '10:30', end: '11:30' },
  3: { start: '11:30', end: '12:30' },
  4: { start: '12:30', end: '13:30' }, // Lunch break
  5: { start: '13:30', end: '14:30' },
  6: { start: '14:30', end: '15:30' },
  7: { start: '15:30', end: '16:30' }
};

// Day mapping
const DAY_MAPPING = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday'
};

class ClassReminderService {
  // Generate class reminders for a student
  static async generateRemindersForStudent(studentId) {
    try {
      const student = await User.findById(studentId);
      if (!student || student.role !== 'student') {
        console.log(`[CLASS REMINDER] Invalid student ID: ${studentId}`);
        return;
      }

      // Get student's timetable
      const timetable = await Timetable.findOne({
        section: student.section,
        year: student.year,
        semester: student.currentSemester,
        academicYear: student.academicYear
      }).populate('days.monday.subject days.tuesday.subject days.wednesday.subject days.thursday.subject days.friday.subject days.saturday.subject');

      if (!timetable) {
        console.log(`[CLASS REMINDER] No timetable found for student: ${studentId}`);
        return;
      }

      // Clear existing reminders for this student
      await ClassReminder.deleteMany({ studentId });

      const reminders = [];
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      // Generate reminders for the next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dayName = DAY_MAPPING[targetDate.getDay()];

        if (dayName === 'sunday') continue; // No classes on Sunday

        const daySlots = timetable.days[dayName] || [];
        
        for (const slot of daySlots) {
          if (slot.type === 'lecture' && slot.subject) {
            // Calculate class time
            const classTime = new Date(targetDate);
            const [hours, minutes] = CLASS_TIMES[slot.hour].start.split(':');
            classTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Only create reminders for future classes
            if (classTime > new Date()) {
              const randomMessage = CLASS_REMINDER_MESSAGES[Math.floor(Math.random() * CLASS_REMINDER_MESSAGES.length)];
              const message = randomMessage.replace('{subject}', slot.subject.name);

              reminders.push({
                studentId: student._id,
                timetableId: timetable._id,
                day: dayName,
                hour: slot.hour,
                subjectId: slot.subject._id,
                subjectName: slot.subject.name,
                classTime: classTime,
                message: message,
                notificationSent: false
              });
            }
          }
        }
      }

      if (reminders.length > 0) {
        await ClassReminder.insertMany(reminders);
        console.log(`[CLASS REMINDER] Generated ${reminders.length} reminders for student: ${studentId}`);
      }

    } catch (error) {
      console.error(`[CLASS REMINDER] Error generating reminders for student ${studentId}:`, error);
    }
  }

  // Send notifications for upcoming classes
  static async sendUpcomingClassNotifications() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      // Find reminders that need to be sent (class starts in 5 minutes)
      const pendingReminders = await ClassReminder.find({
        classTime: {
          $gte: now,
          $lte: fiveMinutesFromNow
        },
        notificationSent: false
      }).populate('studentId', 'fcmToken pushNotificationsEnabled firstName lastName');

      if (pendingReminders.length === 0) {
        return;
      }

      console.log(`[CLASS REMINDER] Found ${pendingReminders.length} pending reminders`);

      // Group reminders by student for efficient notification sending
      const studentNotifications = {};
      pendingReminders.forEach(reminder => {
        if (!studentNotifications[reminder.studentId._id]) {
          studentNotifications[reminder.studentId._id] = [];
        }
        studentNotifications[reminder.studentId._id].push(reminder);
      });

      // Send notifications to each student
      for (const [studentId, reminders] of Object.entries(studentNotifications)) {
        const student = reminders[0].studentId;
        
        if (!student.fcmToken || !student.pushNotificationsEnabled) {
          console.log(`[CLASS REMINDER] Student ${studentId} has no FCM token or notifications disabled`);
          continue;
        }

        try {
          // Send notification
          await sendPushNotificationToMultiple([student.fcmToken], {
            title: 'Class Reminder',
            message: reminders[0].message,
            body: reminders[0].message, // Keep body for compatibility
            type: 'class_reminder',
            data: {
              subjectName: reminders[0].subjectName,
              classTime: reminders[0].classTime.toISOString(),
              day: reminders[0].day,
              hour: reminders[0].hour
            }
          });

          // Mark reminders as sent
          await ClassReminder.updateMany(
            { _id: { $in: reminders.map(r => r._id) } },
            { 
              notificationSent: true, 
              notificationSentAt: new Date() 
            }
          );

          console.log(`[CLASS REMINDER] Sent notification to student ${studentId} for ${reminders[0].subjectName}`);

        } catch (error) {
          console.error(`[CLASS REMINDER] Error sending notification to student ${studentId}:`, error);
        }
      }

    } catch (error) {
      console.error('[CLASS REMINDER] Error in sendUpcomingClassNotifications:', error);
    }
  }

  // Generate reminders for all students
  static async generateRemindersForAllStudents() {
    try {
      const students = await User.find({ 
        role: 'student', 
        isActive: true 
      }).select('_id section year currentSemester academicYear');

      console.log(`[CLASS REMINDER] Generating reminders for ${students.length} students`);

      for (const student of students) {
        await this.generateRemindersForStudent(student._id);
      }

      console.log('[CLASS REMINDER] Completed generating reminders for all students');

    } catch (error) {
      console.error('[CLASS REMINDER] Error generating reminders for all students:', error);
    }
  }

  // Clean up old reminders (older than 7 days)
  static async cleanupOldReminders() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await ClassReminder.deleteMany({
        classTime: { $lt: sevenDaysAgo }
      });

      console.log(`[CLASS REMINDER] Cleaned up ${result.deletedCount} old reminders`);

    } catch (error) {
      console.error('[CLASS REMINDER] Error cleaning up old reminders:', error);
    }
  }
}

module.exports = ClassReminderService; 