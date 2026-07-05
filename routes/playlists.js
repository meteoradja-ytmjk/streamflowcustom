const express = require('express');
const router = express.Router();
const PlaylistController = require('../controllers/playlistController');
const { isAuthenticated } = require('../middleware/auth');
const {
  createPlaylistValidation,
  updatePlaylistValidation,
  deletePlaylistValidation,
  addVideoToPlaylistValidation,
  removeVideoFromPlaylistValidation,
  reorderPlaylistValidation
} = require('../middleware/validators/playlistValidator');

/**
 * Playlist Management Routes
 */

// Playlists page
router.get('/playlists', isAuthenticated, PlaylistController.showPlaylistsPage);

// Get playlists
router.get('/api/playlists', isAuthenticated, PlaylistController.getPlaylists);
router.get('/api/playlists/:id', isAuthenticated, PlaylistController.getPlaylist);

// Create playlist
router.post('/api/playlists', isAuthenticated, createPlaylistValidation, PlaylistController.createPlaylist);

// Update playlist
router.put('/api/playlists/:id', isAuthenticated, updatePlaylistValidation, PlaylistController.updatePlaylist);

// Delete playlist
router.delete('/api/playlists/:id', isAuthenticated, deletePlaylistValidation, PlaylistController.deletePlaylist);

// Manage videos in playlist
router.post('/api/playlists/:id/videos', isAuthenticated, addVideoToPlaylistValidation, PlaylistController.addVideoToPlaylist);
router.delete('/api/playlists/:id/videos/:videoId', isAuthenticated, removeVideoFromPlaylistValidation, PlaylistController.removeVideoFromPlaylist);

// Reorder playlist
router.put('/api/playlists/:id/reorder', isAuthenticated, reorderPlaylistValidation, PlaylistController.reorderPlaylist);

// Get content for playlist
router.get('/api/playlists/content/videos', isAuthenticated, PlaylistController.getVideosForPlaylist);

module.exports = router;
