const { body } = require('express-validator');

/**
 * Validation rules for settings endpoints
 */

const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Username cannot be empty')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const updateYouTubeCredentialsValidation = [
  body('youtubeClientId')
    .trim()
    .notEmpty()
    .withMessage('YouTube Client ID is required')
    .isLength({ min: 20 })
    .withMessage('Invalid Client ID format'),
  body('youtubeClientSecret')
    .trim()
    .notEmpty()
    .withMessage('YouTube Client Secret is required')
    .isLength({ min: 20 })
    .withMessage('Invalid Client Secret format')
];

const updateRecaptchaValidation = [
  body('recaptchaSiteKey')
    .trim()
    .notEmpty()
    .withMessage('reCAPTCHA site key is required'),
  body('recaptchaSecretKey')
    .trim()
    .notEmpty()
    .withMessage('reCAPTCHA secret key is required')
];

const updateGeminiApiKeysValidation = [
  body('geminiApiKeys')
    .trim()
    .notEmpty()
    .withMessage('Gemini API keys cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('API keys are too long')
];

module.exports = {
  updateProfileValidation,
  changePasswordValidation,
  updateYouTubeCredentialsValidation,
  updateRecaptchaValidation,
  updateGeminiApiKeysValidation
};
