const VideoService = require('../services/videoService');
const Video = require('../models/Video');
const MediaFolder = require('../models/MediaFolder');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Video Controller
 * Handles video-related HTTP requests
 */

class VideoController {
  /**
   * Show gallery page
   */
  static async showGallery(req, res) {
    try {
      const currentFolderId = req.query.folder && req.query.folder !== 'root' && req.query.folder !== 'null' ? req.query.folder : null;
      
      const folders = await MediaFolder.findAllByUser(req.session.userId);
      const currentFolder = currentFolderId ? await MediaFolder.findById(currentFolderId, req.session.userId) : null;
      
      if (currentFolderId && !currentFolder) {
        return res.redirect('/gallery');
      }
      
      const videos = await Video.findByUserAndFolder(req.session.userId, currentFolderId);
      
      res.render('gallery', {
        title: 'Video Gallery',
        active: 'gallery',
        user: await User.findById(req.session.userId),
        videos: videos,
        folders: folders,
        currentFolder: currentFolder,
        currentFolderId: currentFolderId || ''
      });
    } catch (error) {
      console.error('Gallery error:', error);
      res.redirect('/dashboard');
    }
  }

  /**
   * Get gallery data (API)
   */
  static async getGalleryData(req, res) {
    try {
      const currentFolderId = req.query.folder && req.query.folder !== 'root' && req.query.folder !== 'null' ? req.query.folder : null;
      
      const folders = await MediaFolder.findAllByUser(req.session.userId);
      const currentFolder = currentFolderId ? await MediaFolder.findById(currentFolderId, req.session.userId) : null;

      if (currentFolderId && !currentFolder) {
        return res.status(404).json({ success: false, error: 'Folder not found' });
      }

      const videos = await Video.findByUserAndFolder(req.session.userId, currentFolderId);
      
      res.json({
        success: true,
        videos,
        folders,
        currentFolder,
        currentFolderId: currentFolderId || ''
      });
    } catch (error) {
      console.error('Gallery data error:', error);
      res.status(500).json({ success: false, error: 'Failed to load gallery data' });
    }
  }

  /**
   * Upload video
   */
  static async uploadVideo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No video file provided'
        });
      }

      const folderId = req.body.folderId && req.body.folderId !== 'root' && req.body.folderId !== 'null' ? req.body.folderId : null;
      
      // Validate folder
      if (folderId) {
        const folder = await MediaFolder.findById(folderId, req.session.userId);
        if (!folder) {
          return res.status(404).json({ success: false, error: 'Folder not found' });
        }
      }

      // Check disk space
      const diskCheck = await VideoService.checkDiskSpace(req.session.userId, req.file.size);
      if (!diskCheck.allowed) {
        // Delete uploaded file
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          error: diskCheck.message
        });
      }

      // Process video
      const result = await VideoService.processUploadedVideo(
        req.file.path,
        req.file.originalname,
        req.file.size,
        req.session.userId,
        folderId
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Video uploaded successfully',
          video: result.video
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload video'
      });
    }
  }

  /**
   * Get videos list
   */
  static async getVideos(req, res) {
    try {
      const allVideos = await Video.findAll(req.session.userId);
      
      // Filter out audio files
      const videos = allVideos.filter(video => {
        const filepath = (video.filepath || '').toLowerCase();
        if (filepath.includes('/audio/')) return false;
        if (filepath.endsWith('.m4a') || filepath.endsWith('.aac') || filepath.endsWith('.mp3')) return false;
        return true;
      });

      const Playlist = require('../models/Playlist');
      const playlists = await Playlist.findAll(req.session.userId);
      
      res.json({ success: true, videos, playlists });
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch videos' });
    }
  }

  /**
   * Rename video
   */
  static async renameVideo(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const result = await VideoService.updateVideo(
        req.params.id,
        req.session.userId,
        { title: req.body.title }
      );

      if (result.success) {
        res.json({ success: true, message: 'Video renamed successfully' });
      } else {
        res.status(result.error === 'Not authorized' ? 403 : 404).json(result);
      }
    } catch (error) {
      console.error('Error renaming video:', error);
      res.status(500).json({ success: false, error: 'Failed to rename video' });
    }
  }

  /**
   * Move video to folder
   */
  static async moveVideo(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const folderId = req.body.folderId && req.body.folderId !== 'root' && req.body.folderId !== 'null' ? req.body.folderId : null;
      
      const result = await VideoService.moveToFolder(
        req.params.id,
        req.session.userId,
        folderId
      );

      if (result.success) {
        res.json({ success: true, folderId: result.folderId });
      } else {
        res.status(result.error === 'Not authorized' ? 403 : 404).json(result);
      }
    } catch (error) {
      console.error('Error moving video:', error);
      res.status(500).json({ success: false, error: 'Failed to move video' });
    }
  }

  /**
   * Delete video
   */
  static async deleteVideo(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const result = await VideoService.deleteVideo(
        req.params.id,
        req.session.userId
      );

      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        const statusCode = result.error.includes('currently used') ? 409 : 
                          result.error === 'Not authorized' ? 403 : 404;
        res.status(statusCode).json(result);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ success: false, error: 'Failed to delete video' });
    }
  }

  /**
   * Import from Google Drive
   */
  static async importFromDrive(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    const { driveUrl } = req.body;
    const folderId = req.body.folderId && req.body.folderId !== 'root' && req.body.folderId !== 'null' ? req.body.folderId : null;

    try {
      // Validate folder
      if (folderId) {
        const folder = await MediaFolder.findById(folderId, req.session.userId);
        if (!folder) {
          return res.status(404).json({ success: false, error: 'Folder not found' });
        }
      }

      const { extractFileId } = require('../utils/googleDriveService');
      const fileId = extractFileId(driveUrl);
      const jobId = uuidv4();

      // Start background import (existing logic from app.js)
      const { processGoogleDriveImport } = require('../services/importService');
      processGoogleDriveImport(jobId, fileId, req.session.userId, folderId)
        .catch(err => console.error('Drive import failed:', err));

      return res.json({
        success: true,
        message: 'Video import started',
        jobId: jobId
      });
    } catch (error) {
      console.error('Google Drive import error:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid Google Drive URL format'
      });
    }
  }

  /**
   * Get import status
   */
  static getImportStatus(req, res) {
    const jobId = req.params.jobId;
    const { importJobs } = require('../services/importService');
    
    if (!importJobs[jobId]) {
      return res.status(404).json({ success: false, error: 'Import job not found' });
    }

    return res.json({
      success: true,
      status: importJobs[jobId]
    });
  }

  /**
   * Stream video
   */
  static async streamVideo(req, res) {
    try {
      const videoId = req.params.videoId;
      const video = await Video.findById(videoId);
      
      if (!video) {
        return res.status(404).send('Video not found');
      }

      if (video.user_id !== req.session.userId) {
        return res.status(403).send('You do not have permission to access this video');
      }

      // Support absolute paths for streaming
      let videoPath;
      if (path.isAbsolute(video.filepath) || (process.platform === 'win32' && /^[a-zA-Z]:[\\\/]/.test(video.filepath))) {
        videoPath = video.filepath;
      } else {
        videoPath = path.join(__dirname, '..', 'public', video.filepath);
      }

      if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video file not found on disk');
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'no-store');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      res.status(500).send('Error streaming video');
    }
  }
}

module.exports = VideoController;
