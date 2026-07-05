const express = require('express');
const router = express.Router();
const RotationController = require('../controllers/rotationController');
const { isAuthenticated } = require('../middleware/auth');
const {
  createRotationValidation,
  updateRotationValidation,
  deleteRotationValidation,
  activateRotationValidation,
  duplicateRotationValidation
} = require('../middleware/validators/rotationValidator');

/**
 * Rotation Management Routes
 */

// Rotations page
router.get('/rotations', isAuthenticated, RotationController.showRotationsPage);

// Get rotations
router.get('/api/rotations', isAuthenticated, RotationController.getRotations);
router.get('/api/rotations/:id', isAuthenticated, RotationController.getRotation);

// Create rotation
router.post('/api/rotations', isAuthenticated, createRotationValidation, RotationController.createRotation);

// Update rotation
router.put('/api/rotations/:id', isAuthenticated, updateRotationValidation, RotationController.updateRotation);

// Delete rotation
router.delete('/api/rotations/:id', isAuthenticated, deleteRotationValidation, RotationController.deleteRotation);

// Rotation actions
router.post('/api/rotations/:id/activate', isAuthenticated, activateRotationValidation, RotationController.activateRotation);
router.post('/api/rotations/:id/pause', isAuthenticated, RotationController.pauseRotation);
router.post('/api/rotations/:id/stop', isAuthenticated, RotationController.stopRotation);

// Duplicate rotation
router.post('/api/rotations/:id/duplicate', isAuthenticated, duplicateRotationValidation, RotationController.duplicateRotation);

// Export rotation
router.get('/api/rotations/:id/export', isAuthenticated, RotationController.exportRotation);

// Get content for rotation
router.get('/api/rotations/content/videos', isAuthenticated, RotationController.getContentForRotation);

module.exports = router;
