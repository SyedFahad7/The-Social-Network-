const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');
const { client: redisClient, connectRedis } = require('../lib/redisClient');
const { sendMail } = require('../lib/mailer');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expires in 7 days
  });
};

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('role')
    .isIn(['student', 'teacher', 'super-admin'])
    .withMessage('Please select a valid role')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password, role } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email, isActive: true });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message: 'Selected role does not match your account type'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    // --- Redis: Mark user as live ---
    await connectRedis();
    await redisClient.sAdd('live_users', user._id.toString());
    await redisClient.set(`user_last_seen:${user._id}`, Date.now());

    // Send response
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
          rollNumber: user.rollNumber,
          section: user.section,
          employeeId: user.employeeId,
          profilePicture: user.profilePicture,
          lastLogin: user.lastLogin
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
}));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // --- Redis: Remove user from live set ---
  await connectRedis();
  if (req.user && req.user._id) {
    await redisClient.sRem('live_users', req.user._id.toString());
    await redisClient.del(`user_last_seen:${req.user._id}`);
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  authenticate,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// @route   GET /api/auth/live-users
// @desc    Get list and count of currently live users (active in last 5 minutes)
// @access  Private (Admin/Super Admin)
router.get('/live-users', authenticate, asyncHandler(async (req, res) => {
  await connectRedis();
  const userIds = await redisClient.sMembers('live_users');
  const now = Date.now();
  const activeUserIds = [];
  for (const id of userIds) {
    const lastSeen = await redisClient.get(`user_last_seen:${id}`);
    if (lastSeen && now - Number(lastSeen) < 5 * 60 * 1000) { // 5 minutes
      activeUserIds.push(id);
    }
  }
  res.json({
    success: true,
    count: activeUserIds.length,
    userIds: activeUserIds
  });
}));

router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: 'Email not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 500);

  user.otp = { code: otp, expiresAt };
  await user.save();

  await sendMail({
    to: email,
    subject: 'Your OTP for Password Reset',
    text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 5 minutes.</p>`,
  });

  res.json({ success: true, message: 'OTP sent to your email' });
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.otp) return res.status(400).json({ success: false, message: 'Invalid request' });

  if (user.otp.code !== otp || user.otp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  res.json({ success: true, message: 'OTP verified' });
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });
  if (!user || !user.otp) return res.status(400).json({ success: false, message: 'Invalid request' });

  if (user.otp.code !== otp || user.otp.expiresAt < new Date()) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }

  // Save password as plain text (not recommended for production)
  user.password = newPassword;
  user.otp = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful' });
});

module.exports = router;