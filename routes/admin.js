const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const {
  createUserValidation,
  updateUserValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  deleteUserValidation,
  getUserStreamsValidation
} = require('../middleware/validators/adminValidator');

/**
 * Admin Routes
 * All routes require admin authentication
 */

// Users management page
router.get('/users', isAdmin, AdminController.showUsersPage);

// Get users
router.get('/api/users', isAdmin, AdminController.getUsers);

// Get user streams
router.get('/api/users/:id/streams', isAdmin, getUserStreamsValidation, AdminController.getUserStreams);

// Create user
router.post(
  '/api/users/create',
  isAdmin,
  (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  createUserValidation,
  AdminController.createUser
);

// Update user
router.post(
  '/api/users/update',
  isAdmin,
  (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  updateUserValidation,
  AdminController.updateUser
);

// Update user status
router.post(
  '/api/users/status',
  isAdmin,
  updateUserStatusValidation,
  AdminController.updateUserStatus
);

// Update user role
router.post(
  '/api/users/role',
  isAdmin,
  updateUserRoleValidation,
  AdminController.updateUserRole
);

// Delete user
router.post(
  '/api/users/delete',
  isAdmin,
  deleteUserValidation,
  AdminController.deleteUser
);

module.exports = router;
