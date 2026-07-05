const { body, param } = require('express-validator');

/**
 * Validation rules for rotation endpoints
 */

const createRotationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Rotation name is required')
    .isLength({ max: 200 })
    .withMessage('Name is too long (max 200 characters)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description is too long (max 1000 characters)'),
  body('ytChannelId')
    .notEmpty()
    .withMessage('YouTube channel is required')
    .isUUID()
    .withMessage('Invalid channel ID format'),
  body('scheduleType')
    .notEmpty()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Schedule type must be daily, weekly, or monthly'),
  body('scheduleTime')
    .notEmpty()
    .withMessage('Schedule time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid time format (use HH:MM)'),
  body('scheduleDayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage('Day of week must be 0-6 (0=Sunday)'),
  body('scheduleDayOfMonth')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('Day of month must be 1-31'),
  body('videoIds')
    .optional()
    .isArray()
    .withMessage('Video IDs must be an array'),
  body('videoIds.*')
    .optional()
    .isUUID()
    .withMessage('Invalid video ID in array'),
  body('playlistIds')
    .optional()
    .isArray()
    .withMessage('Playlist IDs must be an array'),
  body('playlistIds.*')
    .optional()
    .isUUID()
    .withMessage('Invalid playlist ID in array'),
  body('useAI')
    .optional()
    .isBoolean()
    .withMessage('useAI must be a boolean'),
  body('geminiApiKey')
    .optional()
    .trim()
    .isLength({ min: 20 })
    .withMessage('Invalid Gemini API key'),
  body('titlePrompt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Title prompt is too long'),
  body('descriptionPrompt')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description prompt is too long')
];

const updateRotationValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid rotation ID'),
  ...createRotationValidation.slice(0, -1) // Reuse create validation except last item
];

const deleteRotationValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid rotation ID')
];

const activateRotationValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid rotation ID')
];

const duplicateRotationValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid rotation ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Name is too long')
];

module.exports = {
  createRotationValidation,
  updateRotationValidation,
  deleteRotationValidation,
  activateRotationValidation,
  duplicateRotationValidation
};
