const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settingsController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/uploadMiddleware');
const {
  updateProfileValidation,
  changePasswordValidation,
  updateYouTubeCredentialsValidation,
  updateRecaptchaValidation,
  updateGeminiApiKeysValidation
} = require('../middleware/validators/settingsValidator');

/**
 * Settings Routes
 */

// Settings page
router.get('/settings', isAuthenticated, SettingsController.showSettingsPage);

// Profile settings
router.post(
  '/settings/profile',
  isAuthenticated,
  (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) {
        return res.redirect('/settings?error=' + encodeURIComponent(err.message) + '&activeTab=profile#profile');
      }
      next();
    });
  },
  updateProfileValidation,
  SettingsController.updateProfile
);

// Security settings
router.post(
  '/settings/password',
  isAuthenticated,
  changePasswordValidation,
  SettingsController.changePassword
);

// YouTube integration
router.post(
  '/settings/youtube',
  isAuthenticated,
  updateYouTubeCredentialsValidation,
  SettingsController.updateYouTubeCredentials
);

router.post(
  '/settings/youtube/disconnect',
  isAuthenticated,
  SettingsController.disconnectYouTube
);

// reCAPTCHA settings (admin only)
router.post(
  '/api/settings/recaptcha',
  isAdmin,
  updateRecaptchaValidation,
  SettingsController.updateRecaptcha
);

// Gemini API keys
router.post(
  '/settings/gemini',
  isAuthenticated,
  updateGeminiApiKeysValidation,
  SettingsController.updateGeminiApiKeys
);

module.exports = router;
