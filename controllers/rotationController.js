const Rotation = require('../models/Rotation');
const Video = require('../models/Video');
const Playlist = require('../models/Playlist');
const YoutubeChannel = require('../models/YoutubeChannel');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Rotation Controller
 * Handles stream rotation management
 */

class RotationController {
  /**
   * Show rotations page
   */
  static async showRotationsPage(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      const rotations = await Rotation.findAll(req.session.userId);
      const youtubeChannels = await YoutubeChannel.findAll(req.session.userId);

      res.render('rotations', {
        title: 'Stream Rotations',
        active: 'rotations',
        user,
        rotations,
        youtubeChannels
      });
    } catch (error) {
      console.error('Error loading rotations page:', error);
      res.redirect('/dashboard');
    }
  }

  /**
   * Get all rotations
   */
  static async getRotations(req, res) {
    try {
      const rotations = await Rotation.findAll(req.session.userId);
      res.json({ success: true, rotations });
    } catch (error) {
      console.error('Error fetching rotations:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch rotations' });
    }
  }

  /**
   * Get single rotation with items
   */
  static async getRotation(req, res) {
    try {
      const rotation = await Rotation.findByIdWithItems(req.params.id);
      
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }

      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      res.json({ success: true, rotation });
    } catch (error) {
      console.error('Error fetching rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch rotation' });
    }
  }

  /**
   * Create new rotation
   */
  static async createRotation(req, res) {
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
        ytChannelId,
        scheduleType,
        scheduleTime,
        scheduleDayOfWeek,
        scheduleDayOfMonth,
        gapMinutes = 10,
        isLoop = true,
        videoIds = [],
        playlistIds = [],
        useAI = false,
        geminiApiKey = '',
        titlePrompt = '',
        descriptionPrompt = ''
      } = req.body;

      // Validate YouTube channel
      const ytChannel = await YoutubeChannel.findById(ytChannelId);
      if (!ytChannel || ytChannel.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Invalid YouTube channel' });
      }

      const rotationData = {
        user_id: req.session.userId,
        name,
        gap_minutes: gapMinutes,
        is_loop: isLoop,
        status: 'inactive',
        youtube_channel_id: ytChannelId
      };

      const rotation = await Rotation.create(rotationData);

      // Add video items
      let orderIndex = 0;
      for (const videoId of videoIds) {
        const video = await Video.findById(videoId);
        if (video && video.user_id === req.session.userId) {
          await Rotation.addItem({
            rotation_id: rotation.id,
            order_index: orderIndex++,
            video_id: videoId,
            title: video.title,
            description: '',
            privacy: 'unlisted',
            category: '22'
          });
        }
      }

      // Add playlist items (expand playlists into individual videos)
      for (const playlistId of playlistIds) {
        const playlist = await Playlist.findByIdWithVideos(playlistId);
        if (playlist && playlist.user_id === req.session.userId) {
          const videos = playlist.videos || [];
          for (const video of videos) {
            await Rotation.addItem({
              rotation_id: rotation.id,
              order_index: orderIndex++,
              video_id: video.id,
              title: video.title,
              description: '',
              privacy: 'unlisted',
              category: '22'
            });
          }
        }
      }

      res.json({
        success: true,
        message: 'Rotation created successfully',
        rotation
      });
    } catch (error) {
      console.error('Error creating rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to create rotation' });
    }
  }

  /**
   * Update rotation
   */
  static async updateRotation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const rotationId = req.params.id;
      
      // Check rotation exists and user owns it
      const existingRotation = await Rotation.findById(rotationId);
      if (!existingRotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (existingRotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const updateData = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.gapMinutes) updateData.gap_minutes = req.body.gapMinutes;
      if (req.body.isLoop !== undefined) updateData.is_loop = req.body.isLoop;
      if (req.body.ytChannelId) updateData.youtube_channel_id = req.body.ytChannelId;

      await Rotation.update(rotationId, updateData, req.session.userId);

      res.json({
        success: true,
        message: 'Rotation updated successfully'
      });
    } catch (error) {
      console.error('Error updating rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to update rotation' });
    }
  }

  /**
   * Delete rotation
   */
  static async deleteRotation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const rotationId = req.params.id;
      
      // Check rotation exists and user owns it
      const rotation = await Rotation.findById(rotationId);
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Prevent deleting active rotations
      if (rotation.status === 'active' || rotation.status === 'live') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete an active rotation. Stop it first.'
        });
      }

      const result = await Rotation.delete(rotationId, req.session.userId);

      if (result.deleted) {
        res.json({ success: true, message: 'Rotation deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Rotation not found' });
      }
    } catch (error) {
      console.error('Error deleting rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to delete rotation' });
    }
  }

  /**
   * Activate rotation
   */
  static async activateRotation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const rotationId = req.params.id;
      
      // Check rotation exists and user owns it
      const rotation = await Rotation.findByIdWithItems(rotationId);
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Check rotation has items
      if (!rotation.items || rotation.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot activate rotation with no items'
        });
      }

      // Deactivate all other rotations for this user
      const allRotations = await Rotation.findAll(req.session.userId);
      for (const r of allRotations) {
        if (r.status === 'active' && r.id !== rotationId) {
          await Rotation.update(r.id, { status: 'inactive' }, req.session.userId);
        }
      }

      // Activate this rotation
      await Rotation.update(rotationId, { status: 'active' }, req.session.userId);

      res.json({
        success: true,
        message: 'Rotation activated successfully'
      });
    } catch (error) {
      console.error('Error activating rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to activate rotation' });
    }
  }

  /**
   * Pause rotation
   */
  static async pauseRotation(req, res) {
    try {
      const rotationId = req.params.id;
      
      const rotation = await Rotation.findById(rotationId);
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await Rotation.update(rotationId, { status: 'paused' }, req.session.userId);

      res.json({
        success: true,
        message: 'Rotation paused successfully'
      });
    } catch (error) {
      console.error('Error pausing rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to pause rotation' });
    }
  }

  /**
   * Stop rotation
   */
  static async stopRotation(req, res) {
    try {
      const rotationId = req.params.id;
      
      const rotation = await Rotation.findById(rotationId);
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await Rotation.update(rotationId, { status: 'inactive' }, req.session.userId);

      res.json({
        success: true,
        message: 'Rotation stopped successfully'
      });
    } catch (error) {
      console.error('Error stopping rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to stop rotation' });
    }
  }

  /**
   * Duplicate rotation
   */
  static async duplicateRotation(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const rotationId = req.params.id;
      const { name } = req.body;
      
      const sourceRotation = await Rotation.findByIdWithItems(rotationId);
      if (!sourceRotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (sourceRotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Create new rotation
      const newRotationData = {
        user_id: req.session.userId,
        name: name || `${sourceRotation.name} (Copy)`,
        gap_minutes: sourceRotation.gap_minutes,
        is_loop: sourceRotation.is_loop,
        status: 'inactive',
        youtube_channel_id: sourceRotation.youtube_channel_id
      };

      const newRotation = await Rotation.create(newRotationData);

      // Copy all items
      for (const item of sourceRotation.items) {
        await Rotation.addItem({
          rotation_id: newRotation.id,
          order_index: item.order_index,
          video_id: item.video_id,
          title: item.title,
          description: item.description,
          tags: item.tags,
          thumbnail_path: item.thumbnail_path,
          original_thumbnail_path: item.original_thumbnail_path,
          privacy: item.privacy,
          category: item.category,
          youtube_monetization: item.youtube_monetization,
          youtube_altered_content: item.youtube_altered_content,
          youtube_made_for_kids: item.youtube_made_for_kids
        });
      }

      res.json({
        success: true,
        message: 'Rotation duplicated successfully',
        rotation: newRotation
      });
    } catch (error) {
      console.error('Error duplicating rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to duplicate rotation' });
    }
  }

  /**
   * Export rotation configuration
   */
  static async exportRotation(req, res) {
    try {
      const rotationId = req.params.id;
      
      const rotation = await Rotation.findByIdWithItems(rotationId);
      if (!rotation) {
        return res.status(404).json({ success: false, error: 'Rotation not found' });
      }
      if (rotation.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Remove sensitive/internal fields
      const exportData = {
        name: rotation.name,
        gap_minutes: rotation.gap_minutes,
        is_loop: rotation.is_loop,
        items: rotation.items.map(item => ({
          order_index: item.order_index,
          video_title: item.video_title,
          title: item.title,
          description: item.description,
          tags: item.tags,
          privacy: item.privacy,
          category: item.category
        }))
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="rotation-${rotation.name}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Error exporting rotation:', error);
      res.status(500).json({ success: false, error: 'Failed to export rotation' });
    }
  }

  /**
   * Get videos and playlists for rotation selection
   */
  static async getContentForRotation(req, res) {
    try {
      const videos = await Video.findAll(req.session.userId);
      const playlists = await Playlist.findAll(req.session.userId);

      res.json({ success: true, videos, playlists });
    } catch (error) {
      console.error('Error fetching content:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
  }
}

module.exports = RotationController;
