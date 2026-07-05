const Video = require('../models/Video');
const User = require('../models/User');
const Stream = require('../models/Stream');
const Playlist = require('../models/Playlist');
const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');
const { getVideoInfo, generateThumbnail } = require('../utils/videoProcessor');

/**
 * Video Service
 * Handles all video-related business logic
 */

class VideoService {
  /**
   * Check if user has enough disk space
   */
  static async checkDiskSpace(userId, fileSize) {
    const user = await User.findById(userId);
    
    if (user.disk_limit > 0) {
      const currentUsage = await User.getDiskUsage(userId);
      const newTotal = currentUsage + fileSize;
      
      if (newTotal > user.disk_limit) {
        return {
          allowed: false,
          message: 'Disk limit exceeded. Please delete some files or contact admin.',
          current: currentUsage,
          limit: user.disk_limit
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Process uploaded video and extract metadata
   */
  static async processUploadedVideo(filePath, originalFilename, fileSize, userId, folderId = null) {
    try {
      const title = path.parse(originalFilename).name;
      const fullFilePath = filePath;

      // Extract metadata with ffprobe
      const metadata = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('ffprobe timeout')), 30000);
        ffmpeg.ffprobe(fullFilePath, (err, metadata) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          resolve(metadata);
        });
      });

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      const duration = metadata.format.duration || 0;
      const format = metadata.format.format_name || '';
      const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : '';
      const bitrate = metadata.format.bit_rate ? Math.round(parseInt(metadata.format.bit_rate) / 1000) : null;

      let fps = null;
      if (videoStream && videoStream.avg_frame_rate) {
        const fpsRatio = videoStream.avg_frame_rate.split('/');
        if (fpsRatio.length === 2 && parseInt(fpsRatio[1]) !== 0) {
          fps = Math.round((parseInt(fpsRatio[0]) / parseInt(fpsRatio[1]) * 100)) / 100;
        } else {
          fps = parseInt(fpsRatio[0]) || null;
        }
      }

      // Generate thumbnail
      const thumbnailFilename = `thumb-${path.parse(path.basename(filePath)).name}.jpg`;
      const thumbnailPath = `/uploads/thumbnails/${thumbnailFilename}`;

      await new Promise((resolve, reject) => {
        ffmpeg(fullFilePath)
          .screenshots({
            timestamps: ['10%'],
            filename: thumbnailFilename,
            folder: path.join(__dirname, '..', 'public', 'uploads', 'thumbnails'),
            size: '854x480'
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Create video record
      const videoData = {
        title,
        filepath: path.relative(path.join(__dirname, '..', 'public'), filePath).replace(/\\/g, '/'),
        thumbnail_path: thumbnailPath,
        file_size: fileSize,
        duration,
        format,
        resolution,
        bitrate,
        fps,
        user_id: userId,
        folder_id: folderId
      };

      const video = await Video.create(videoData);
      return { success: true, video };

    } catch (error) {
      console.error('Error processing video:', error);
      
      // Clean up file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to process video'
      };
    }
  }

  /**
   * Check if video is used in any live stream
   */
  static async findLiveStreamConflicts(userId, videoIds) {
    const targetIds = Array.from(new Set((videoIds || []).filter(Boolean)));
    if (targetIds.length === 0) {
      return [];
    }

    const targetIdSet = new Set(targetIds);
    const liveStreams = await Stream.findAll(userId, 'live');
    const playlistCache = new Map();
    const conflicts = [];

    for (const stream of liveStreams) {
      if (!stream || !stream.video_id) {
        continue;
      }

      // Check direct video usage
      if (stream.video_type === 'video') {
        if (targetIdSet.has(stream.video_id)) {
          conflicts.push({
            videoId: stream.video_id,
            streamId: stream.id,
            streamTitle: stream.title || 'Untitled stream'
          });
        }
        continue;
      }

      // Check playlist usage
      if (stream.video_type === 'playlist') {
        let playlist = playlistCache.get(stream.video_id);
        if (playlist === undefined) {
          playlist = await Playlist.findByIdWithVideos(stream.video_id);
          playlistCache.set(stream.video_id, playlist || null);
        }

        if (!playlist) continue;

        const playlistItems = [...(playlist.videos || []), ...(playlist.audios || [])];
        for (const item of playlistItems) {
          if (targetIdSet.has(item.id)) {
            conflicts.push({
              videoId: item.id,
              streamId: stream.id,
              streamTitle: stream.title || playlist.name || 'Untitled stream'
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Delete video and clean up files
   */
  static async deleteVideo(videoId, userId) {
    try {
      // Check if video exists and user owns it
      const video = await Video.findById(videoId);
      if (!video) {
        return { success: false, error: 'Video not found' };
      }

      if (video.user_id !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      // Check if video is in use by any live stream
      const conflicts = await this.findLiveStreamConflicts(userId, [video.id]);
      if (conflicts.length > 0) {
        const conflict = conflicts[0];
        return {
          success: false,
          error: `Cannot delete file because it is currently used by live stream "${conflict.streamTitle}". Stop the stream first.`
        };
      }

      // Delete video record from database
      await Video.delete(videoId);

      // Note: Files are kept for now to prevent accidental data loss
      // You can add file cleanup logic here if needed

      return { success: true, message: 'Video deleted successfully' };
    } catch (error) {
      console.error('Error deleting video:', error);
      return { 
        success: false, 
        error: 'Failed to delete video' 
      };
    }
  }

  /**
   * Update video metadata
   */
  static async updateVideo(videoId, userId, updateData) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        return { success: false, error: 'Video not found' };
      }

      if (video.user_id !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      await Video.update(videoId, updateData);
      return { success: true, message: 'Video updated successfully' };
    } catch (error) {
      console.error('Error updating video:', error);
      return { 
        success: false, 
        error: 'Failed to update video' 
      };
    }
  }

  /**
   * Get videos by user and folder
   */
  static async getVideos(userId, folderId = null) {
    try {
      const videos = await Video.findByUserAndFolder(userId, folderId);
      return { success: true, videos };
    } catch (error) {
      console.error('Error getting videos:', error);
      return { 
        success: false, 
        error: 'Failed to get videos' 
      };
    }
  }

  /**
   * Move video to folder
   */
  static async moveToFolder(videoId, userId, folderId) {
    try {
      const video = await Video.findById(videoId);
      if (!video || video.user_id !== userId) {
        return { success: false, error: 'Video not found' };
      }

      // Validate folder if provided
      if (folderId) {
        const MediaFolder = require('../models/MediaFolder');
        const folder = await MediaFolder.findById(folderId, userId);
        if (!folder) {
          return { success: false, error: 'Folder not found' };
        }
      }

      await Video.update(videoId, { folder_id: folderId });
      return { success: true, folderId };
    } catch (error) {
      console.error('Error moving video:', error);
      return { 
        success: false, 
        error: 'Failed to move video' 
      };
    }
  }
}

module.exports = VideoService;
