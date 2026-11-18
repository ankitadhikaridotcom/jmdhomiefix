const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT from HTTP-only cookie
const requireAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token.' });
  }

  try {
    const user = await User.findById(decoded.id).select('role verificationStatus');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }
    if (user.role === 'provider' && user.verificationStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'This provider account is suspended.' });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      verificationStatus: user.verificationStatus,
      email: decoded.email,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

// Role-based middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role.' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
