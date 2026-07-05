const User = require('../models/User');

/**
 * Authentication Middleware
 * Check if user is authenticated and has valid session
 */
const isAuthenticated = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login');
    }

    // Check trial expiration
    if (user.status === 'trial') {
      const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
      const createdAt = new Date(user.created_at || Date.now()).getTime();
      if (Date.now() - createdAt > trialDuration) {
        await User.updateStatus(user.id, 'expired');
        req.session.destroy();
        return res.redirect('/login?error=expired');
      }
    }

    // Check account status
    if (user.status === 'expired' || user.status === 'inactive') {
      req.session.destroy();
      return res.redirect('/login?error=expired');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
};

/**
 * Admin Authorization Middleware
 * Check if user has admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/login');
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.user_role !== 'admin') {
      return res.redirect('/dashboard');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.redirect('/dashboard');
  }
};

/**
 * Check ownership middleware
 * Verify that user owns the resource
 */
const checkOwnership = (Model, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      if (resource.user_id !== req.session.userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify ownership'
      });
    }
  };
};

module.exports = {
  isAuthenticated,
  isAdmin,
  checkOwnership
};
