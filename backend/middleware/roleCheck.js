// Role-based access control middleware
const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Student role required.'
    });
  }
};

const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Teacher role required.'
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super-admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'super-admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin role required.'
    });
  }
};

const isStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'teacher' || req.user.role === 'admin' || req.user.role === 'super-admin')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Staff role required.'
    });
  }
};

const isDepartmentMember = (req, res, next) => {
  if (req.user && req.user.department) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Department membership required.'
    });
  }
};

const isSameDepartment = (req, res, next) => {
  const targetDepartment = req.params.departmentId || req.body.departmentId;
  
  if (req.user.role === 'super-admin') {
    return next(); // Super admin can access all departments
  }
  
  if (req.user.department && req.user.department.toString() === targetDepartment.toString()) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own department.'
    });
  }
};

const isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (req.user.role === 'super-admin') {
    return next(); // Super admin can access everything
  }
  
  if (req.user.role === 'admin' && req.user.department) {
    return next(); // Admin can access their department
  }
  
  if (req.user._id.toString() === resourceUserId.toString()) {
    return next(); // User can access their own resources
  }
  
  res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own resources.'
  });
};

module.exports = {
  isStudent,
  isTeacher,
  isAdmin,
  isSuperAdmin,
  isStaff,
  isDepartmentMember,
  isSameDepartment,
  isOwnerOrAdmin
}; 