const { body, param } = require('express-validator');

/**
 * Validation rules for playlist endpoints
 */

const createPlaylistValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Playlist name is required')
    .isLength({ max: 200 })
    .withMessage('Name is too long (max 200 characters)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description is too long (max 1000 characters)'),
  body('shuffle')
    .optional()
    .isBoolean()
    .withMessage('Shuffle must be a boolean'),
  body('videos')
    .optional()
    .isArray()
    .withMessage('Videos must be an array'),
  body('videos.*')
    .optional()
    .isUUID()
    .withMessage('Invalid video ID in videos array'),
  body('audios')
    .optional()
    .isArray()
    .withMessage('Audios must be an array'),
  body('audios.*')
    .optional()
    .isUUID()
    .withMessage('Invalid audio ID in audios array')
];

const updatePlaylistValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid playlist ID'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Playlist name is required')
    .isLength({ max: 200 })
    .withMessage('Name is too long (max 200 characters)'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description is too long (max 1000 characters)'),
  body('shuffle')
    .optional()
    .isBoolean()
    .withMessage('Shuffle must be a boolean'),
  body('videos')
    .optional()
    .isArray()
    .withMessage('Videos must be an array'),
  body('audios')
    .optional()
    .isArray()
    .withMessage('Audios must be an array')
];

const deletePlaylistValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid playlist ID')
];

const addVideoToPlaylistValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid playlist ID'),
  body('videoId')
    .notEmpty()
    .withMessage('Video ID is required')
    .isUUID()
    .withMessage('Invalid video ID format')
];

const removeVideoFromPlaylistValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid playlist ID'),
  param('videoId')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid video ID')
];

const reorderPlaylistValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid playlist ID'),
  body('videoPositions')
    .isArray()
    .withMessage('Video positions must be an array')
    .notEmpty()
    .withMessage('Video positions array cannot be empty')
];

module.exports = {
  createPlaylistValidation,
  updatePlaylistValidation,
  deletePlaylistValidation,
  addVideoToPlaylistValidation,
  removeVideoFromPlaylistValidation,
  reorderPlaylistValidation
};
