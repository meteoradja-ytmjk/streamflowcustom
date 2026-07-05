const { body, param } = require('express-validator');

/**
 * Validation rules for admin endpoints
 */

const createUserValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Role must be admin or user'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
  body('diskLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Disk limit must be a positive number')
];

const updateUserValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),
  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('Role must be admin or user'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
  body('diskLimit')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Disk limit must be a positive number')
];

const updateUserStatusValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),
  body('status')
    .notEmpty()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

const updateUserRoleValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format'),
  body('role')
    .notEmpty()
    .isIn(['admin', 'user'])
    .withMessage('Role must be admin or user')
];

const deleteUserValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID format')
];

const getUserStreamsValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid user ID format')
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  updateUserStatusValidation,
  updateUserRoleValidation,
  deleteUserValidation,
  getUserStreamsValidation
};
