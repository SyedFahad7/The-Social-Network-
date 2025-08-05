const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { client: redisClient, connectRedis } = require('../lib/redisClient');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }
    
    req.user = user;
    // --- Redis: Update last seen timestamp ---
    await connectRedis();
    await redisClient.set(`user_last_seen:${user._id}`, Date.now());
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Check if user has required role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

// Check if user is super admin
const requireSuperAdmin = authorize('super-admin');

// Check if user is teacher or above
const requireTeacher = authorize('teacher', 'super-admin');

// Check if user is student
const requireStudent = authorize('student');

// Check if user owns the resource or is admin
const requireOwnershipOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'super-admin') {
    return next();
  }
  
  if (req.user._id.toString() === resourceUserId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own resources.'
  });
};

module.exports = {
  authenticate,
  authorize,
  requireSuperAdmin,
  requireTeacher,
  requireStudent,
  requireOwnershipOrAdmin
};