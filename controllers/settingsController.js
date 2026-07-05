const User = require('../models/User');
const YoutubeChannel = require('../models/YoutubeChannel');
const AppSettings = require('../models/AppSettings');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const packageJson = require('../package.json');

/**
 * Settings Controller
 * Handles user settings and integrations
 */

class SettingsController {
  /**
   * Show settings page
   */
  static async showSettingsPage(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect('/login');
      }

      const hasYoutubeCredentials = !!(user.youtube_client_id && user.youtube_client_secret);
      const youtubeChannels = await YoutubeChannel.findAll(req.session.userId);
      const isYoutubeConnected = youtubeChannels.length > 0;
      const defaultChannel = youtubeChannels.find(c => c.is_default) || youtubeChannels[0];

      const recaptchaSettings = await AppSettings.getRecaptchaSettings();
      const geminiApiKeys = await AppSettings.get('gemini_api_keys') || '';

      res.render('settings', {
        title: 'Settings',
        active: 'settings',
        user,
        appVersion: packageJson.version,
        youtubeClientId: user.youtube_client_id || '',
        youtubeClientSecret: user.youtube_client_secret ? '••••••••••••••••' : '',
        youtubeConnected: isYoutubeConnected,
        youtubeChannels,
        youtubeChannelName: defaultChannel?.channel_name || '',
        youtubeChannelThumbnail: defaultChannel?.channel_thumbnail || '',
        youtubeSubscriberCount: defaultChannel?.subscriber_count || '0',
        hasYoutubeCredentials,
        recaptchaSiteKey: recaptchaSettings.siteKey || '',
        recaptchaSecretKey: recaptchaSettings.secretKey ? '••••••••••••••••' : '',
        hasRecaptchaKeys: recaptchaSettings.hasKeys,
        recaptchaEnabled: recaptchaSettings.enabled,
        geminiApiKeys,
        success: req.query.success || null,
        error: req.query.error || null,
        activeTab: req.query.activeTab || null
      });
    } catch (error) {
      console.error('Settings error:', error);
      res.redirect('/login');
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/settings?error=${encodeURIComponent(errors.array()[0].msg)}&activeTab=profile#profile`);
    }

    try {
      const { username } = req.body;
      const updateData = {};

      // Update username if provided
      if (username) {
        // Check if username is already taken
        const existingUser = await User.findByUsername(username);
        if (existingUser && existingUser.id !== req.session.userId) {
          return res.redirect('/settings?error=' + encodeURIComponent('Username already taken') + '&activeTab=profile#profile');
        }
        updateData.username = username;
      }

      // Handle avatar upload
      if (req.file) {
        // Delete old avatar if exists
        const user = await User.findById(req.session.userId);
        if (user.avatar_path && user.avatar_path !== '/images/default-avatar.jpg') {
          const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar_path);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }

        updateData.avatar_path = `/uploads/avatars/${req.file.filename}`;
      }

      if (Object.keys(updateData).length > 0) {
        await User.update(req.session.userId, updateData);
      }

      res.redirect('/settings?success=' + encodeURIComponent('Profile updated successfully') + '&activeTab=profile#profile');
    } catch (error) {
      console.error('Error updating profile:', error);
      res.redirect('/settings?error=' + encodeURIComponent('Failed to update profile') + '&activeTab=profile#profile');
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/settings?error=${encodeURIComponent(errors.array()[0].msg)}&activeTab=security#security`);
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.session.userId);

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.redirect('/settings?error=' + encodeURIComponent('Current password is incorrect') + '&activeTab=security#security');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.update(req.session.userId, { password: hashedPassword });

      res.redirect('/settings?success=' + encodeURIComponent('Password changed successfully') + '&activeTab=security#security');
    } catch (error) {
      console.error('Error changing password:', error);
      res.redirect('/settings?error=' + encodeURIComponent('Failed to change password') + '&activeTab=security#security');
    }
  }

  /**
   * Update YouTube credentials
   */
  static async updateYouTubeCredentials(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/settings?error=${encodeURIComponent(errors.array()[0].msg)}&activeTab=integrations#integrations`);
    }

    try {
      const { youtubeClientId, youtubeClientSecret } = req.body;
      const { encrypt } = require('../utils/encryption');

      await User.update(req.session.userId, {
        youtube_client_id: encrypt(youtubeClientId),
        youtube_client_secret: encrypt(youtubeClientSecret)
      });

      res.redirect('/settings?success=' + encodeURIComponent('YouTube credentials updated successfully') + '&activeTab=integrations#integrations');
    } catch (error) {
      console.error('Error updating YouTube credentials:', error);
      res.redirect('/settings?error=' + encodeURIComponent('Failed to update YouTube credentials') + '&activeTab=integrations#integrations');
    }
  }

  /**
   * Disconnect YouTube account
   */
  static async disconnectYouTube(req, res) {
    try {
      // Delete all YouTube channels
      await YoutubeChannel.deleteByUserId(req.session.userId);

      res.redirect('/settings?success=' + encodeURIComponent('YouTube account disconnected successfully') + '&activeTab=integrations#integrations');
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
      res.redirect('/settings?error=' + encodeURIComponent('Failed to disconnect YouTube account') + '&activeTab=integrations#integrations');
    }
  }

  /**
   * Update reCAPTCHA settings (Admin only)
   */
  static async updateRecaptcha(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { recaptchaSiteKey, recaptchaSecretKey, recaptchaEnabled } = req.body;

      await AppSettings.set('recaptcha_site_key', recaptchaSiteKey);
      await AppSettings.set('recaptcha_secret_key', recaptchaSecretKey);
      await AppSettings.set('recaptcha_enabled', recaptchaEnabled ? '1' : '0');

      res.json({
        success: true,
        message: 'reCAPTCHA settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating reCAPTCHA settings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update reCAPTCHA settings'
      });
    }
  }

  /**
   * Update Gemini API keys
   */
  static async updateGeminiApiKeys(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/settings?error=${encodeURIComponent(errors.array()[0].msg)}&activeTab=integrations#integrations`);
    }

    try {
      const { geminiApiKeys } = req.body;

      await AppSettings.set('gemini_api_keys', geminiApiKeys);

      res.redirect('/settings?success=' + encodeURIComponent('Gemini API keys updated successfully') + '&activeTab=integrations#integrations');
    } catch (error) {
      console.error('Error updating Gemini API keys:', error);
      res.redirect('/settings?error=' + encodeURIComponent('Failed to update Gemini API keys') + '&activeTab=integrations#integrations');
    }
  }
}

module.exports = SettingsController;
