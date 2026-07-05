const express = require('express');
const router = express.Router();
const VideoController = require('../controllers/videoController');
const { isAuthenticated } = require('../middleware/auth');
const { uploadVideo } = require('../middleware/uploadMiddleware');
const {
  renameVideoValidation,
  moveVideoValidation,
  deleteVideoValidation,
  importDriveValidation
} = require('../middleware/validators/videoValidator');

/**
 * Video Management Routes
 */

// Gallery page
router.get('/gallery', isAuthenticated, VideoController.showGallery);
router.get('/api/gallery/data', isAuthenticated, VideoController.getGalleryData);

// Video operations
router.get('/api/videos', isAuthenticated, VideoController.getVideos);
router.post('/api/videos/upload', isAuthenticated, uploadVideo.single('video'), VideoController.uploadVideo);
router.post('/api/videos/:id/rename', isAuthenticated, renameVideoValidation, VideoController.renameVideo);
router.put('/api/videos/:id/folder', isAuthenticated, moveVideoValidation, VideoController.moveVideo);
router.delete('/api/videos/:id', isAuthenticated, deleteVideoValidation, VideoController.deleteVideo);

// Video streaming
router.get('/stream/:videoId', isAuthenticated, VideoController.streamVideo);

// Import operations
router.post('/api/videos/import-drive', isAuthenticated, importDriveValidation, VideoController.importFromDrive);
router.get('/api/videos/import-status/:jobId', isAuthenticated, VideoController.getImportStatus);

module.exports = router;
