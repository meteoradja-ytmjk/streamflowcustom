const Playlist = require('../models/Playlist');
const Video = require('../models/Video');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Playlist Controller
 * Handles playlist management
 */

class PlaylistController {
  /**
   * Show playlists page
   */
  static async showPlaylistsPage(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      const playlists = await Playlist.findAll(req.session.userId);

      res.render('playlists', {
        title: 'Playlists',
        active: 'playlists',
        user,
        playlists
      });
    } catch (error) {
      console.error('Error loading playlists page:', error);
      res.redirect('/dashboard');
    }
  }

  /**
   * Get all playlists
   */
  static async getPlaylists(req, res) {
    try {
      const playlists = await Playlist.findAll(req.session.userId);
      res.json({ success: true, playlists });
    } catch (error) {
      console.error('Error fetching playlists:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch playlists' });
    }
  }

  /**
   * Get single playlist with videos
   */
  static async getPlaylist(req, res) {
    try {
      const playlist = await Playlist.findByIdWithVideos(req.params.id);
      
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }

      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      res.json({ success: true, playlist });
    } catch (error) {
      console.error('Error fetching playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch playlist' });
    }
  }

  /**
   * Create new playlist
   */
  static async createPlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const {
        name,
        description = '',
        shuffle = false,
        videos = [],
        audios = []
      } = req.body;

      const playlistData = {
        name,
        description,
        is_shuffle: shuffle ? 1 : 0,
        user_id: req.session.userId
      };

      const playlist = await Playlist.create(playlistData);

      // Add videos to playlist
      for (let i = 0; i < videos.length; i++) {
        const videoId = videos[i];
        const video = await Video.findById(videoId);
        
        if (video && video.user_id === req.session.userId) {
          await Playlist.addVideo(playlist.id, videoId, i);
        }
      }

      // Add audios to playlist
      for (let i = 0; i < audios.length; i++) {
        const audioId = audios[i];
        const audio = await Video.findById(audioId);
        
        if (audio && audio.user_id === req.session.userId) {
          await Playlist.addAudio(playlist.id, audioId, i);
        }
      }

      res.json({
        success: true,
        message: 'Playlist created successfully',
        playlist
      });
    } catch (error) {
      console.error('Error creating playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to create playlist' });
    }
  }

  /**
   * Update playlist
   */
  static async updatePlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const playlistId = req.params.id;
      
      // Check playlist exists and user owns it
      const existingPlaylist = await Playlist.findById(playlistId);
      if (!existingPlaylist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      if (existingPlaylist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const {
        name,
        description,
        shuffle,
        videos,
        audios
      } = req.body;

      const updateData = {
        name,
        description,
        is_shuffle: shuffle ? 1 : 0
      };

      await Playlist.update(playlistId, updateData);

      // If videos array is provided, update playlist videos
      if (Array.isArray(videos)) {
        // Remove all existing videos
        const currentPlaylist = await Playlist.findByIdWithVideos(playlistId);
        for (const video of currentPlaylist.videos || []) {
          await Playlist.removeVideo(playlistId, video.id);
        }

        // Add new videos
        for (let i = 0; i < videos.length; i++) {
          const videoId = videos[i];
          const video = await Video.findById(videoId);
          
          if (video && video.user_id === req.session.userId) {
            await Playlist.addVideo(playlistId, videoId, i);
          }
        }
      }

      // If audios array is provided, update playlist audios
      if (Array.isArray(audios)) {
        // Clear existing audios
        await Playlist.clearAudios(playlistId);

        // Add new audios
        for (let i = 0; i < audios.length; i++) {
          const audioId = audios[i];
          const audio = await Video.findById(audioId);
          
          if (audio && audio.user_id === req.session.userId) {
            await Playlist.addAudio(playlistId, audioId, i);
          }
        }
      }

      res.json({
        success: true,
        message: 'Playlist updated successfully'
      });
    } catch (error) {
      console.error('Error updating playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to update playlist' });
    }
  }

  /**
   * Delete playlist
   */
  static async deletePlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const playlistId = req.params.id;
      
      // Check playlist exists and user owns it
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Check if playlist is used in any live stream
      const Stream = require('../models/Stream');
      const liveStreams = await Stream.findAll(req.session.userId, 'live');
      
      for (const stream of liveStreams) {
        if (stream.video_type === 'playlist' && stream.video_id === playlistId) {
          return res.status(400).json({
            success: false,
            error: `Cannot delete playlist because it is currently used by live stream "${stream.title}". Stop the stream first.`
          });
        }
      }

      const result = await Playlist.delete(playlistId);

      if (result.deleted) {
        res.json({ success: true, message: 'Playlist deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Playlist not found' });
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to delete playlist' });
    }
  }

  /**
   * Add video to playlist
   */
  static async addVideoToPlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const playlistId = req.params.id;
      const { videoId } = req.body;
      
      // Check playlist exists and user owns it
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Check video exists and user owns it
      const video = await Video.findById(videoId);
      if (!video) {
        return res.status(404).json({ success: false, error: 'Video not found' });
      }
      if (video.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized to add this video' });
      }

      const position = await Playlist.getNextPosition(playlistId);
      await Playlist.addVideo(playlistId, videoId, position);

      res.json({
        success: true,
        message: 'Video added to playlist'
      });
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to add video to playlist' });
    }
  }

  /**
   * Remove video from playlist
   */
  static async removeVideoFromPlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { id: playlistId, videoId } = req.params;
      
      // Check playlist exists and user owns it
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const result = await Playlist.removeVideo(playlistId, videoId);

      if (result.deleted) {
        res.json({ success: true, message: 'Video removed from playlist' });
      } else {
        res.status(404).json({ success: false, error: 'Video not in playlist' });
      }
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to remove video from playlist' });
    }
  }

  /**
   * Reorder videos in playlist
   */
  static async reorderPlaylist(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const playlistId = req.params.id;
      const { videoPositions } = req.body;
      
      // Check playlist exists and user owns it
      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      if (playlist.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await Playlist.updateVideoPositions(playlistId, videoPositions);

      res.json({
        success: true,
        message: 'Playlist reordered successfully'
      });
    } catch (error) {
      console.error('Error reordering playlist:', error);
      res.status(500).json({ success: false, error: 'Failed to reorder playlist' });
    }
  }

  /**
   * Get all videos for playlist selection
   */
  static async getVideosForPlaylist(req, res) {
    try {
      const videos = await Video.findAll(req.session.userId);
      
      // Separate videos and audios
      const videoList = videos.filter(v => {
        const filepath = (v.filepath || '').toLowerCase();
        return !filepath.includes('/audio/') && 
               !filepath.endsWith('.m4a') && 
               !filepath.endsWith('.aac') && 
               !filepath.endsWith('.mp3');
      });

      const audioList = videos.filter(v => {
        const filepath = (v.filepath || '').toLowerCase();
        return filepath.includes('/audio/') || 
               filepath.endsWith('.m4a') || 
               filepath.endsWith('.aac') || 
               filepath.endsWith('.mp3');
      });

      res.json({
        success: true,
        videos: videoList,
        audios: audioList
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch videos' });
    }
  }
}

module.exports = PlaylistController;
