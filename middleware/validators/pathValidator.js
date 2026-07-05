const path = require('path');
const fs = require('fs');

/**
 * Path Validation Middleware
 * Provides security checks for file path operations
 */

class PathValidator {
  /**
   * Whitelist of allowed directories for local file import
   * Customize these based on your server setup
   */
  static ALLOWED_DIRECTORIES = [
    // Windows common video directories
    'C:\\Users\\Public\\Videos',
    'D:\\Videos',
    'E:\\Videos',
    // Add more allowed paths here
  ];

  /**
   * Check if path is within allowed directories
   */
  static isPathAllowed(filePath) {
    const normalizedPath = path.normalize(filePath);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      return { allowed: false, reason: 'Path traversal detected' };
    }

    // Check if path is absolute
    if (!path.isAbsolute(normalizedPath)) {
      return { allowed: false, reason: 'Only absolute paths are allowed' };
    }

    // Check if path is in whitelist (if whitelist is configured)
    if (this.ALLOWED_DIRECTORIES.length > 0) {
      const isInWhitelist = this.ALLOWED_DIRECTORIES.some(allowedDir => {
        const normalizedAllowed = path.normalize(allowedDir);
        return normalizedPath.startsWith(normalizedAllowed);
      });

      if (!isInWhitelist) {
        return { 
          allowed: false, 
          reason: 'Path is not in allowed directories. Contact admin to whitelist this path.' 
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Validate file exists and is accessible
   */
  static validateFileAccess(filePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return { valid: false, reason: 'File does not exist' };
      }

      // Check if it's a file (not a directory)
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        return { valid: false, reason: 'Path is not a file' };
      }

      // Check if file is readable
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
      } catch (err) {
        return { valid: false, reason: 'File is not readable. Permission denied.' };
      }

      return { valid: true, size: stats.size };
    } catch (error) {
      return { 
        valid: false, 
        reason: `File access error: ${error.message}` 
      };
    }
  }

  /**
   * Validate video file extension
   */
  static isVideoFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = [
      '.mp4', '.avi', '.mov', '.mkv', 
      '.flv', '.wmv', '.webm', '.m4v',
      '.mpeg', '.mpg', '.3gp'
    ];
    
    return allowedExtensions.includes(ext);
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename) {
    // Remove any path separators and dangerous characters
    return filename
      .replace(/[\/\\]/g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/\.\./g, '')
      .trim();
  }

  /**
   * Express middleware for local import validation
   */
  static validateLocalImport(req, res, next) {
    const { localPath } = req.body;

    if (!localPath) {
      return res.status(400).json({
        success: false,
        error: 'Local path is required'
      });
    }

    // Normalize path
    const normalizedPath = path.resolve(localPath);

    // Check if path is allowed
    const pathCheck = PathValidator.isPathAllowed(normalizedPath);
    if (!pathCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: pathCheck.reason
      });
    }

    // Validate file access
    const accessCheck = PathValidator.validateFileAccess(normalizedPath);
    if (!accessCheck.valid) {
      return res.status(400).json({
        success: false,
        error: accessCheck.reason
      });
    }

    // Check if it's a video file
    if (!PathValidator.isVideoFile(normalizedPath)) {
      return res.status(400).json({
        success: false,
        error: 'Only video files are allowed'
      });
    }

    // Attach validated data to request
    req.validatedPath = normalizedPath;
    req.fileSize = accessCheck.size;

    next();
  }
}

module.exports = PathValidator;
