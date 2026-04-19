const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  try {
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. ${req.user.role} role is not authorized.` 
      });
    }
    next();
  };
};

// Check if user owns the resource or is admin
const checkOwnership = (resourceField = 'user') => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }

    // For customer accessing their own resources
    if (req.user.role === 'customer' && req[resourceField] && req[resourceField].toString() === req.user._id.toString()) {
      return next();
    }

    // For provider accessing their own resources
    if (req.user.role === 'provider' && req[resourceField] && req[resourceField].toString() === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied. You can only access your own resources.' });
  };
};

// Verify KYC status for providers
const verifyKYC = (req, res, next) => {
  if (req.user.role === 'provider' && req.user.kycStatus !== 'approved') {
    return res.status(403).json({ 
      message: 'KYC verification required. Please complete your KYC verification to access this feature.' 
    });
  }
  next();
};

// Check if user is verified
const checkVerification = (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ 
      message: 'Email verification required. Please verify your email address.' 
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  checkOwnership,
  verifyKYC,
  checkVerification
};
