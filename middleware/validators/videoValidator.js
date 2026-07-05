const { body, param, query } = require('express-validator');

/**
 * Validation rules for video endpoints
 */

const renameVideoValidation = [
  param('id')
    .notEmpty()
    .withMessage('Video ID is required')
    .isUUID()
    .withMessage('Invalid video ID format'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title is too long (max 200 characters)')
];

const moveVideoValidation = [
  param('id')
    .notEmpty()
    .withMessage('Video ID is required')
    .isUUID()
    .withMessage('Invalid video ID format'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const importDriveValidation = [
  body('driveUrl')
    .trim()
    .notEmpty()
    .withMessage('Google Drive URL is required')
    .matches(/drive\.google\.com/)
    .withMessage('Invalid Google Drive URL'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const importMediafireValidation = [
  body('mediafireUrl')
    .trim()
    .notEmpty()
    .withMessage('Mediafire URL is required')
    .matches(/mediafire\.com/)
    .withMessage('Invalid Mediafire URL'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const importDropboxValidation = [
  body('dropboxUrl')
    .trim()
    .notEmpty()
    .withMessage('Dropbox URL is required')
    .matches(/dropbox\.com/)
    .withMessage('Invalid Dropbox URL'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const importMegaValidation = [
  body('megaUrl')
    .trim()
    .notEmpty()
    .withMessage('MEGA URL is required')
    .matches(/mega\.(nz|co\.nz)/)
    .withMessage('Invalid MEGA URL'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const importLocalValidation = [
  body('localPath')
    .trim()
    .notEmpty()
    .withMessage('Local file path is required')
    .custom((value) => {
      // Prevent path traversal attacks
      if (value.includes('..')) {
        throw new Error('Invalid path: path traversal detected');
      }
      return true;
    }),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title is too long (max 200 characters)'),
  body('folderId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid folder ID format')
];

const deleteVideoValidation = [
  param('id')
    .notEmpty()
    .withMessage('Video ID is required')
    .isUUID()
    .withMessage('Invalid video ID format')
];

module.exports = {
  renameVideoValidation,
  moveVideoValidation,
  importDriveValidation,
  importMediafireValidation,
  importDropboxValidation,
  importMegaValidation,
  importLocalValidation,
  deleteVideoValidation
};
