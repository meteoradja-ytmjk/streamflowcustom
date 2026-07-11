const Stream = require('../models/Stream');
const Video = require('../models/Video');
const Playlist = require('../models/Playlist');
const YoutubeChannel = require('../models/YoutubeChannel');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Stream Controller
 * Handles stream management HTTP requests
 */

class StreamController {
  /**
   * Get all streams (paginated)
   */
  static async getStreams(req, res) {
    try {
      const { page = 1, limit = 10, filter = null, search = '' } = req.query;
      
      const result = await Stream.findAllPaginated(req.session.userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        filter,
        search
      });

      res.json({
        success: true,
        streams: result.streams,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching streams:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch streams' });
    }
  }

  /**
   * Get single stream by ID
   */
  static async getStream(req, res) {
    try {
      const stream = await Stream.getStreamWithVideo(req.params.id);
      
      if (!stream) {
        return res.status(404).json({ success: false, error: 'Stream not found' });
      }

      if (stream.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      res.json({ success: true, stream });
    } catch (error) {
      console.error('Error fetching stream:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stream' });
    }
  }

  /**
   * Create new stream
   */
  static async createStream(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const {
        streamTitle,
        rtmpUrl,
        streamKey,
        videoId,
        audioId = null,
        platform = 'Custom',
        platformIcon = '',
        bitrate = 2500,
        fps = 30,
        resolution = '1280x720',
        orientation = 'horizontal',
        loopVideo = true,
        scheduleTime = null,
        endTime = null,
        scheduleType = 'once',
        scheduleWeekdays = null,
        useAdvancedSettings = false
      } = req.body;

      // Check if stream key is already in use
      if (streamKey) {
        const isInUse = await Stream.isStreamKeyInUse(streamKey, req.session.userId);
        if (isInUse) {
          return res.status(400).json({
            success: false,
            error: 'Stream key is already in use by another stream'
          });
        }
      }

      // Validate video exists if provided
      if (videoId) {
        const video = await Video.findById(videoId);
        if (!video) {
          return res.status(404).json({ success: false, error: 'Video not found' });
        }
        if (video.user_id !== req.session.userId) {
          return res.status(403).json({ success: false, error: 'Not authorized to use this video' });
        }
      }

      const streamData = {
        title: streamTitle,
        video_id: videoId,
        audio_id: audioId,
        rtmp_url: rtmpUrl,
        stream_key: streamKey,
        platform,
        platform_icon: platformIcon,
        bitrate,
        fps,
        resolution,
        orientation,
        loop_video: loopVideo,
        schedule_time: scheduleTime,
        end_time: endTime,
        schedule_type: scheduleType,
        schedule_weekdays: scheduleWeekdays,
        use_advanced_settings: useAdvancedSettings,
        status: scheduleTime ? 'scheduled' : 'offline',
        user_id: req.session.userId
      };

      const stream = await Stream.create(streamData);

      res.json({
        success: true,
        message: 'Stream created successfully',
        stream
      });
    } catch (error) {
      console.error('Error creating stream:', error);
      res.status(500).json({ success: false, error: 'Failed to create stream' });
    }
  }

  /**
   * Create YouTube stream via API
   */
  static async createYouTubeStream(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const user = await User.findById(req.session.userId);

      // Check YouTube credentials configured
      if (!user.youtube_client_id || !user.youtube_client_secret) {
        return res.status(400).json({
          success: false,
          error: 'YouTube API credentials not configured.'
        });
      }

      const { 
        videoId, 
        title, 
        description, 
        privacy, 
        category, 
        tags, 
        loopVideo, 
        scheduleStartTime, 
        scheduleEndTime, 
        ytChannelId, 
        ytMonetization, 
        ytAlteredContent, 
        ytMadeForKids 
      } = req.body;

      // Validate YouTube channel selection
      let selectedChannel;
      if (ytChannelId) {
        selectedChannel = await YoutubeChannel.findById(ytChannelId);
        if (!selectedChannel || selectedChannel.user_id !== req.session.userId) {
          console.warn(`[YouTube Mapping] User ${req.session.userId} attempted to use invalid channel ${ytChannelId}`);
          return res.status(400).json({ success: false, error: 'Invalid channel selected' });
        }
      } else {
        console.warn(`[YouTube Mapping] No channel specified for new stream creation attempt by user ${req.session.userId}`);
        return res.status(400).json({ success: false, error: 'YouTube channel must be selected' });
      }

      // Validate channel has tokens
      if (!selectedChannel || !selectedChannel.access_token || !selectedChannel.refresh_token) {
        return res.status(400).json({
          success: false,
          error: 'YouTube account not connected. Please connect your YouTube account in Settings.'
        });
      }

      // Validate video
      if (!videoId) {
        return res.status(400).json({ success: false, error: 'Video is required' });
      }

      if (!title) {
        return res.status(400).json({ success: false, error: 'Stream title is required' });
      }

      // Process thumbnail if uploaded
      let localThumbnailPath = null;
      if (req.file) {
        try {
          const path = require('path');
          const { generateImageThumbnail } = require('../utils/videoProcessor');
          
          const originalFilename = req.file.filename;
          const thumbFilename = `thumb-${path.parse(originalFilename).name}.jpg`;
          await generateImageThumbnail(req.file.path, thumbFilename);
          localThumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
        } catch (thumbError) {
          console.log('Note: Could not process thumbnail:', thumbError.message);
        }
      }

      // Prepare stream data
      const streamData = {
        title: title,
        video_id: videoId,
        rtmp_url: '',
        stream_key: '',
        platform: 'YouTube',
        platform_icon: 'ti-brand-youtube',
        bitrate: 4000,
        resolution: '1920x1080',
        fps: 30,
        orientation: 'horizontal',
        loop_video: loopVideo === 'true' || loopVideo === true,
        use_advanced_settings: false,
        user_id: req.session.userId,
        youtube_broadcast_id: null,
        youtube_stream_id: null,
        youtube_description: description || '',
        youtube_privacy: privacy || 'unlisted',
        youtube_category: category || '22',
        youtube_tags: tags || '',
        youtube_thumbnail: localThumbnailPath,
        youtube_channel_id: selectedChannel.id,
        is_youtube_api: true,
        youtube_monetization: ytMonetization === 'true' || ytMonetization === true,
        youtube_altered_content: ytAlteredContent === 'true' || ytAlteredContent === true,
        youtube_made_for_kids: ytMadeForKids === 'true' || ytMadeForKids === true
      };

      // Parse schedule time if provided
      if (scheduleStartTime) {
        const [datePart, timePart] = scheduleStartTime.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const scheduleDate = new Date(year, month - 1, day, hours, minutes);
        streamData.schedule_time = scheduleDate.toISOString();
        streamData.status = 'scheduled';
      } else {
        streamData.status = 'offline';
      }

      // Parse end time if provided
      if (scheduleEndTime) {
        const [datePart, timePart] = scheduleEndTime.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        const endDate = new Date(year, month - 1, day, hours, minutes);
        streamData.end_time = endDate.toISOString();
      }

      // Create stream record
      const stream = await Stream.create(streamData);

      res.json({
        success: true,
        stream,
        message: 'Stream created. YouTube broadcast will be created when stream starts.'
      });
    } catch (error) {
      console.error('Error creating YouTube stream:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create YouTube stream'
      });
    }
  }

  /**
   * Update stream
   */
  static async updateStream(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const streamId = req.params.id;
      
      // Check stream exists and user owns it
      const existingStream = await Stream.findById(streamId);
      if (!existingStream) {
        return res.status(404).json({ success: false, error: 'Stream not found' });
      }
      if (existingStream.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Check stream key uniqueness if being updated
      if (req.body.streamKey && req.body.streamKey !== existingStream.stream_key) {
        const isInUse = await Stream.isStreamKeyInUse(req.body.streamKey, req.session.userId, streamId);
        if (isInUse) {
          return res.status(400).json({
            success: false,
            error: 'Stream key is already in use by another stream'
          });
        }
      }

      const updateData = {};
      if (req.body.streamTitle) updateData.title = req.body.streamTitle;
      if (req.body.rtmpUrl) updateData.rtmp_url = req.body.rtmpUrl;
      if (req.body.streamKey !== undefined) updateData.stream_key = req.body.streamKey;
      if (req.body.videoId !== undefined) updateData.video_id = req.body.videoId;
      if (req.body.audioId !== undefined) updateData.audio_id = req.body.audioId;
      if (req.body.bitrate) updateData.bitrate = req.body.bitrate;
      if (req.body.fps) updateData.fps = req.body.fps;
      if (req.body.resolution) updateData.resolution = req.body.resolution;
      if (req.body.orientation) updateData.orientation = req.body.orientation;
      if (req.body.loopVideo !== undefined) updateData.loop_video = req.body.loopVideo;
      if (req.body.scheduleTime !== undefined) updateData.schedule_time = req.body.scheduleTime;
      if (req.body.endTime !== undefined) updateData.end_time = req.body.endTime;
      if (req.body.scheduleType !== undefined) updateData.schedule_type = req.body.scheduleType;
      if (req.body.scheduleWeekdays !== undefined) updateData.schedule_weekdays = req.body.scheduleWeekdays;

      await Stream.update(streamId, updateData, req.session.userId);

      res.json({
        success: true,
        message: 'Stream updated successfully'
      });
    } catch (error) {
      console.error('Error updating stream:', error);
      res.status(500).json({ success: false, error: 'Failed to update stream' });
    }
  }

  /**
   * Delete stream
   */
  static async deleteStream(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const streamId = req.params.id;
      
      // Check stream exists and user owns it
      const stream = await Stream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ success: false, error: 'Stream not found' });
      }
      if (stream.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Prevent deleting live streams
      if (stream.status === 'live') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete a live stream. Stop the stream first.'
        });
      }

      const result = await Stream.delete(streamId, req.session.userId);

      if (result.deleted) {
        res.json({ success: true, message: 'Stream deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Stream not found' });
      }
    } catch (error) {
      console.error('Error deleting stream:', error);
      res.status(500).json({ success: false, error: 'Failed to delete stream' });
    }
  }

  /**
   * Update stream status
   */
  static async updateStreamStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const streamId = req.params.id;
      const { status } = req.body;

      // Check stream exists and user owns it
      const stream = await Stream.findById(streamId);
      if (!stream) {
        return res.status(404).json({ success: false, error: 'Stream not found' });
      }
      if (stream.user_id !== req.session.userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const result = await Stream.updateStatus(streamId, status, req.session.userId);

      if (result.updated) {
        res.json({
          success: true,
          message: `Stream status updated to ${status}`,
          status: result.status
        });
      } else {
        res.status(404).json({ success: false, error: 'Stream not found' });
      }
    } catch (error) {
      console.error('Error updating stream status:', error);
      res.status(500).json({ success: false, error: 'Failed to update stream status' });
    }
  }

  /**
   * Check if stream key is available
   */
  static async checkStreamKey(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { key, excludeId } = req.query;
      const isInUse = await Stream.isStreamKeyInUse(key, req.session.userId, excludeId);

      res.json({
        success: true,
        available: !isInUse
      });
    } catch (error) {
      console.error('Error checking stream key:', error);
      res.status(500).json({ success: false, error: 'Failed to check stream key' });
    }
  }

  /**
   * Get videos for stream selection
   */
  static async getVideosForStream(req, res) {
    try {
      const allVideos = await Video.findAll(req.session.userId);
      
      // Filter out audio files
      const videos = allVideos.filter(video => {
        const filepath = (video.filepath || '').toLowerCase();
        if (filepath.includes('/audio/')) return false;
        if (filepath.endsWith('.m4a') || filepath.endsWith('.aac') || filepath.endsWith('.mp3')) return false;
        return true;
      });

      // Filter in audio files
      const audios = allVideos.filter(video => {
        const filepath = (video.filepath || '').toLowerCase();
        return filepath.includes('/audio/') || filepath.endsWith('.m4a') || filepath.endsWith('.aac') || filepath.endsWith('.mp3');
      });

      const playlists = await Playlist.findAll(req.session.userId);

      res.json({ success: true, videos, playlists, audios });
    } catch (error) {
      console.error('Error fetching content:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch content' });
    }
  }
}

module.exports = StreamController;
