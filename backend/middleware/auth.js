const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isApprovedProvider } = require('../utils/serviceHelpers');

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
    const user = await User.findById(decoded.id).select('role providerStatus verificationStatus accountStatus');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account no longer exists.' });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account is suspended.' });
    }
    if (user.role === 'provider' && user.verificationStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'This provider account is suspended.' });
    }

    const approvedProvider = isApprovedProvider(user);
    req.user = {
      id: user._id.toString(),
      role: user.role,
      providerStatus: user.role === 'provider'
        ? (user.providerStatus === 'not_applied' ? user.verificationStatus : user.providerStatus)
        : user.providerStatus,
      verificationStatus: user.verificationStatus,
      accountStatus: user.accountStatus,
      isApprovedProvider: approvedProvider,
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
    const approvedProvider = Boolean(req.user.isApprovedProvider || isApprovedProvider(req.user));
    const authorized = role === 'provider'
      ? approvedProvider
      : role === 'customer'
        ? req.user.role === 'customer' || approvedProvider
        : req.user.role === role;
    if (!authorized) {
      return res.status(403).json({ success: false, message: 'Forbidden: insufficient role.' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
