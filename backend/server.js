const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Load models in correct order (Department before User)
require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const assignmentRoutes = require('./routes/assignments');
const attendanceRoutes = require('./routes/attendance');
const timetableRoutes = require('./routes/timetable');
const certificateRoutes = require('./routes/certificates');
const feedbackRoutes = require('./routes/feedback');
const sectionRoutes = require('./routes/sections');
const subjectRoutes = require('./routes/subjects');
const academicYearRoutes = require('./routes/academic-years');
const notificationRoutes = require('./routes/notifications');
const classmatesRoutes = require('./routes/classmates');
const classReminderRoutes = require('./routes/classReminders');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://192.168.1.218:3000',
      'http://192.168.1.218:5000',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:3004',
      'http://localhost:3005',
      'https://social-network-final.vercel.app',
      'https://social-network-frontend-chm0.onrender.com'
    ];
    
    // Allow requests from allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// GLOBAL REQUEST LOGGER - logs every request
app.use((req, res, next) => {
  console.log('[GLOBAL LOGGER]', req.method, req.originalUrl, {
    params: req.params,
    query: req.query,
    body: req.body
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Social Network API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/classmates', classmatesRoutes);
app.use('/api/class-reminders', classReminderRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start cron jobs
  // startClassReminderJobs();
  
  // Initialize attendance summary cron jobs
  const { initializeAttendanceCronJobs } = require('./cron/attendanceSummaryCron');
  initializeAttendanceCronJobs();
  
  // Start server only after DB connection
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 API Health (Network): http://0.0.0.0:${PORT}/api/health`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

module.exports = app;