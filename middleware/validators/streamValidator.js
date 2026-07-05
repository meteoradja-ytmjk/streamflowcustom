const { body, param, query } = require('express-validator');

/**
 * Validation rules for stream endpoints
 */

const createStreamValidation = [
  body('streamTitle')
    .trim()
    .notEmpty()
    .withMessage('Stream title is required')
    .isLength({ max: 200 })
    .withMessage('Title is too long'),
  body('rtmpUrl')
    .trim()
    .notEmpty()
    .withMessage('RTMP URL is required')
    .matches(/^rtmp(s)?:\/\//)
    .withMessage('Invalid RTMP URL format'),
  body('streamKey')
    .trim()
    .notEmpty()
    .withMessage('Stream key is required'),
  body('videoId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('Invalid video ID format'),
  body('bitrate')
    .optional()
    .isInt({ min: 500, max: 50000 })
    .withMessage('Bitrate must be between 500 and 50000 kbps'),
  body('fps')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('FPS must be between 10 and 120'),
  body('resolution')
    .optional()
    .matches(/^\d+x\d+$/)
    .withMessage('Invalid resolution format (use WIDTHxHEIGHT)'),
  body('orientation')
    .optional()
    .isIn(['horizontal', 'vertical'])
    .withMessage('Orientation must be horizontal or vertical')
];

const createYouTubeStreamValidation = [
  body('videoId')
    .notEmpty()
    .withMessage('Video is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Stream title is required')
    .isLength({ max: 100 })
    .withMessage('Title is too long (max 100 characters for YouTube)'),
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description is too long (max 5000 characters)'),
  body('privacy')
    .optional()
    .isIn(['public', 'unlisted', 'private'])
    .withMessage('Invalid privacy setting'),
  body('category')
    .optional()
    .isString()
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Tags are too long (max 500 characters)'),
  body('ytChannelId')
    .notEmpty()
    .withMessage('YouTube channel must be selected')
    .isUUID()
    .withMessage('Invalid channel ID format')
];

const updateStreamValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid stream ID'),
  body('streamTitle')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Stream title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title is too long'),
  body('rtmpUrl')
    .optional()
    .trim()
    .matches(/^rtmp(s)?:\/\//)
    .withMessage('Invalid RTMP URL format'),
  body('bitrate')
    .optional()
    .isInt({ min: 500, max: 50000 })
    .withMessage('Bitrate must be between 500 and 50000 kbps'),
  body('fps')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('FPS must be between 10 and 120')
];

const streamStatusValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid stream ID'),
  body('status')
    .notEmpty()
    .isIn(['live', 'offline', 'scheduled'])
    .withMessage('Invalid status. Must be live, offline, or scheduled')
];

const deleteStreamValidation = [
  param('id')
    .notEmpty()
    .isUUID()
    .withMessage('Invalid stream ID')
];

const streamKeyCheckValidation = [
  query('key')
    .notEmpty()
    .withMessage('Stream key is required'),
  query('excludeId')
    .optional()
    .isUUID()
    .withMessage('Invalid exclude ID format')
];

module.exports = {
  createStreamValidation,
  createYouTubeStreamValidation,
  updateStreamValidation,
  streamStatusValidation,
  deleteStreamValidation,
  streamKeyCheckValidation
};
