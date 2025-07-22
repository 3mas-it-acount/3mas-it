const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'firstName', 'lastName']
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Invalid token or user inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Token verification failed'
    });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Admin privileges required'
    });
  }
  next();
};

// Check if user can access resource (admin or own resource)
const requireOwnerOrAdmin = (req, res, next) => {
  const userId = parseInt(req.params.userId || req.params.id);
  
  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You can only access your own resources'
    });
  }
};

function requireAdminOrManager(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied', message: 'Admin or manager privileges required' });
}

module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  requireAdminOrManager
};
