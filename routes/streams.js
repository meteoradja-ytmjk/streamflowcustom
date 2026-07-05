const express = require('express');
const router = express.Router();
const StreamController = require('../controllers/streamController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadThumbnail } = require('../middleware/uploadMiddleware');
const {
  createStreamValidation,
  createYouTubeStreamValidation,
  updateStreamValidation,
  streamStatusValidation,
  deleteStreamValidation,
  streamKeyCheckValidation
} = require('../middleware/validators/streamValidator');

/**
 * Stream Management Routes
 */

// Get streams
router.get('/api/streams', isAuthenticated, StreamController.getStreams);
router.get('/api/streams/:id', isAuthenticated, StreamController.getStream);

// Create streams
router.post('/api/streams', isAuthenticated, createStreamValidation, StreamController.createStream);

// YouTube stream creation with thumbnail upload
router.post(
  '/api/streams/youtube',
  isAuthenticated,
  (req, res, next) => {
    uploadThumbnail.single('thumbnail')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  createYouTubeStreamValidation,
  StreamController.createYouTubeStream
);

// Update stream
router.put('/api/streams/:id', isAuthenticated, updateStreamValidation, StreamController.updateStream);

// Stream status
router.post('/api/streams/:id/status', isAuthenticated, streamStatusValidation, StreamController.updateStreamStatus);

// Delete stream
router.delete('/api/streams/:id', isAuthenticated, deleteStreamValidation, StreamController.deleteStream);

// Check stream key availability
router.get('/api/streams/check/key', isAuthenticated, streamKeyCheckValidation, StreamController.checkStreamKey);

// Get content for stream selection
router.get('/api/stream/content', isAuthenticated, StreamController.getVideosForStream);
router.get('/api/stream/videos', isAuthenticated, StreamController.getVideosForStream);

module.exports = router;
