const cron = require('node-cron');
const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
const User = require('../models/User');

// Function to recalculate attendance for all students
const recalculateAllStudentsAttendance = async () => {
  try {
    console.log('Starting daily attendance summary calculation...');
    
    // Get all students
    const students = await User.find({ role: 'student', isActive: true });
    console.log(`Found ${students.length} active students`);
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const student of students) {
      try {
        // Calculate attendance for yesterday (in case teachers marked it late)
        await DailyAttendanceSummary.calculateDailyAttendance(student._id, yesterdayStr);
        
        // Calculate attendance for today
        await DailyAttendanceSummary.calculateDailyAttendance(student._id, today);
        
        // Recalculate study streak
        await DailyAttendanceSummary.calculateStudyStreak(student._id);
        
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`Processed ${processedCount}/${students.length} students...`);
        }
      } catch (error) {
        console.error(`Error processing student ${student._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`Daily attendance summary calculation completed. Processed: ${processedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error in daily attendance summary calculation:', error);
  }
};

// Function to recalculate attendance for a specific date range
const recalculateDateRange = async (startDate, endDate) => {
  try {
    console.log(`Recalculating attendance from ${startDate} to ${endDate}...`);
    
    const students = await User.find({ role: 'student', isActive: true });
    console.log(`Found ${students.length} active students`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const student of students) {
      try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Recalculate for each day in the range
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dateStr = date.toISOString().split('T')[0];
          await DailyAttendanceSummary.calculateDailyAttendance(student._id, dateStr);
        }
        
        // Recalculate overall streak
        await DailyAttendanceSummary.calculateStudyStreak(student._id);
        
        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`Processed ${processedCount}/${students.length} students...`);
        }
      } catch (error) {
        console.error(`Error processing student ${student._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`Date range recalculation completed. Processed: ${processedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error in date range recalculation:', error);
  }
};

// Schedule daily calculation at midnight (00:00)
const scheduleDailyCalculation = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled daily attendance summary calculation...');
    recalculateAllStudentsAttendance();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });
  
  console.log('Daily attendance summary cron job scheduled for midnight (00:00)');
};

// Schedule weekly recalculation on Sundays at 1 AM
const scheduleWeeklyRecalculation = () => {
  cron.schedule('0 1 * * 0', () => {
    console.log('Running scheduled weekly attendance recalculation...');
    
    // Recalculate last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    recalculateDateRange(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });
  
  console.log('Weekly attendance recalculation cron job scheduled for Sundays at 1 AM');
};

// Initialize cron jobs
const initializeAttendanceCronJobs = () => {
  scheduleDailyCalculation();
  scheduleWeeklyRecalculation();
  
  console.log('Attendance summary cron jobs initialized');
};

// Manual trigger functions (for testing or immediate execution)
const triggerDailyCalculation = () => {
  console.log('Manually triggering daily attendance calculation...');
  recalculateAllStudentsAttendance();
};

const triggerDateRangeCalculation = (startDate, endDate) => {
  console.log(`Manually triggering date range calculation from ${startDate} to ${endDate}...`);
  recalculateDateRange(startDate, endDate);
};

module.exports = {
  initializeAttendanceCronJobs,
  recalculateAllStudentsAttendance,
  recalculateDateRange,
  triggerDailyCalculation,
  triggerDateRangeCalculation
};
