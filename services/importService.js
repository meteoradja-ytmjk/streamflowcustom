const Video = require('../models/Video');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const { v4: uuidv4 } = require('uuid');

/**
 * Import Service
 * Handles background import jobs from various sources
 */

// Store import job statuses in memory
const importJobs = {};

/**
 * Process Google Drive import
 */
async function processGoogleDriveImport(jobId, fileId, userId, folderId = null) {
  const { downloadFile } = require('../utils/googleDriveService');
  const { getVideoInfo, generateThumbnail } = require('../utils/videoProcessor');

  importJobs[jobId] = {
    status: 'downloading',
    progress: 0,
    message: 'Starting download...'
  };

  try {
    let result;
    try {
      result = await downloadFile(fileId, (progress) => {
        importJobs[jobId] = {
          status: 'downloading',
          progress: progress.progress,
          message: `Downloading ${progress.filename}: ${progress.progress}%`
        };
      });
    } catch (downloadError) {
      importJobs[jobId] = {
        status: 'failed',
        progress: 0,
        message: downloadError.message || 'Failed to download file'
      };
      setTimeout(() => { delete importJobs[jobId]; }, 5 * 60 * 1000);
      return;
    }

    if (!result || !result.localFilePath) {
      importJobs[jobId] = {
        status: 'failed',
        progress: 0,
        message: 'Download completed but file path is missing'
      };
      setTimeout(() => { delete importJobs[jobId]; }, 5 * 60 * 1000);
      return;
    }

    importJobs[jobId] = {
      status: 'processing',
      progress: 100,
      message: 'Processing video...'
    };

    // Get video info and metadata
    let videoInfo;
    try {
      videoInfo = await getVideoInfo(result.localFilePath);
    } catch (infoError) {
      videoInfo = { duration: 0 };
    }

    let resolution = '';
    let bitrate = null;

    try {
      const metadata = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('ffprobe timeout')), 30000);
        ffmpeg.ffprobe(result.localFilePath, (err, metadata) => {
          clearTimeout(timeout);
          if (err) return reject(err);
          resolve(metadata);
        });
      });

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (videoStream) {
        resolution = `${videoStream.width}x${videoStream.height}`;
      }

      if (metadata.format && metadata.format.bit_rate) {
        bitrate = Math.round(parseInt(metadata.format.bit_rate) / 1000);
      }
    } catch (probeError) {
      console.log('ffprobe error (non-fatal):', probeError.message);
    }

    // Generate thumbnail
    const thumbnailBaseName = path.basename(result.filename, path.extname(result.filename));
    const thumbnailName = thumbnailBaseName + '.jpg';
    let thumbnailRelativePath = null;

    try {
      await generateThumbnail(result.localFilePath, thumbnailName);
      thumbnailRelativePath = `/uploads/thumbnails/${thumbnailName}`;
    } catch (thumbError) {
      console.log('Thumbnail generation failed (non-fatal):', thumbError.message);
    }

    let format = path.extname(result.filename).toLowerCase().replace('.', '');
    if (!format) format = 'mp4';

    const videoData = {
      title: path.basename(result.filename, path.extname(result.filename)),
      filepath: `/uploads/videos/${result.filename}`,
      thumbnail_path: thumbnailRelativePath,
      file_size: result.fileSize,
      duration: videoInfo.duration || 0,
      format: format,
      resolution: resolution,
      bitrate: bitrate,
      user_id: userId,
      folder_id: folderId
    };

    const video = await Video.create(videoData);

    importJobs[jobId] = {
      status: 'complete',
      progress: 100,
      message: 'Video imported successfully',
      videoId: video.id
    };

    // Clean up after 5 minutes
    setTimeout(() => {
      delete importJobs[jobId];
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error processing Google Drive import:', error.message);
    importJobs[jobId] = {
      status: 'failed',
      progress: 0,
      message: error.message || 'Failed to import video'
    };
    setTimeout(() => {
      delete importJobs[jobId];
    }, 5 * 60 * 1000);
  }
}

module.exports = {
  importJobs,
  processGoogleDriveImport
};
