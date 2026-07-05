const User = require('../models/User');
const { validationResult } = require('express-validator');
const { decrypt } = require('../utils/encryption');

/**
 * Authentication Controller
 * Handles all authentication-related logic
 */

class AuthController {
  /**
   * Show login page
   */
  static async showLogin(req, res) {
    if (req.session.userId) {
      return res.redirect('/dashboard');
    }

    try {
      const { checkIfUsersExist } = require('../db/database');
      const usersExist = await checkIfUsersExist();
      
      if (!usersExist) {
        return res.redirect('/setup-account');
      }

      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();

      let errorMessage = null;
      if (req.query.error === 'expired') {
        errorMessage = 'Masa Trial Anda (1 Hari) telah habis. Silakan hubungi admin atau Purchase.';
      }

      res.render('login', {
        title: 'Login',
        error: errorMessage,
        recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
      });
    } catch (error) {
      console.error('Error loading login page:', error);
      res.render('login', {
        title: 'Login',
        error: 'System error. Please try again.',
        recaptchaSiteKey: null
      });
    }
  }

  /**
   * Process login
   */
  static async processLogin(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();
      
      return res.render('login', {
        title: 'Login',
        error: errors.array()[0].msg,
        recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
      });
    }

    const { username, password } = req.body;
    const recaptchaResponse = req.body['g-recaptcha-response'];

    try {
      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();

      // Verify reCAPTCHA if enabled
      if (recaptchaSettings.hasKeys && recaptchaSettings.enabled) {
        if (!recaptchaResponse) {
          return res.render('login', {
            title: 'Login',
            error: 'Please complete the reCAPTCHA verification',
            recaptchaSiteKey: recaptchaSettings.siteKey
          });
        }

        const secretKey = decrypt(recaptchaSettings.secretKey);
        const axios = require('axios');
        const verifyResponse = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(recaptchaResponse)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!verifyResponse.data.success) {
          return res.render('login', {
            title: 'Login',
            error: 'reCAPTCHA verification failed. Please try again.',
            recaptchaSiteKey: recaptchaSettings.siteKey
          });
        }
      }

      // Find user
      const user = await User.findByUsername(username);
      if (!user) {
        return res.render('login', {
          title: 'Login',
          error: 'Invalid username or password',
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }

      // Verify password
      const passwordMatch = await User.verifyPassword(password, user.password);
      if (!passwordMatch) {
        return res.render('login', {
          title: 'Login',
          error: 'Invalid username or password',
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }

      // Check trial status
      if (user.status === 'trial') {
        const trialDuration = 24 * 60 * 60 * 1000; // 24 hours
        const createdAt = new Date(user.created_at || Date.now()).getTime();
        if (Date.now() - createdAt > trialDuration) {
          await User.updateStatus(user.id, 'expired');
          user.status = 'expired';
        }
      }

      // Check account status
      if (user.status === 'expired') {
        return res.render('login', {
          title: 'Login',
          error: 'Masa Trial Anda (1 Hari) telah habis. Silakan hubungi admin atau Purchase.',
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }

      if (user.status !== 'active' && user.status !== 'trial') {
        return res.render('login', {
          title: 'Login',
          error: 'Your account is not active. Please contact administrator for activation.',
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.avatar_path = user.avatar_path;
      req.session.user_role = user.user_role;

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      res.render('login', {
        title: 'Login',
        error: 'An error occurred during login. Please try again.',
        recaptchaSiteKey: null
      });
    }
  }

  /**
   * Logout
   */
  static logout(req, res) {
    req.session.destroy();
    res.redirect('/login');
  }

  /**
   * Show signup page
   */
  static async showSignup(req, res) {
    if (req.session.userId) {
      return res.redirect('/dashboard');
    }

    try {
      const { checkIfUsersExist } = require('../db/database');
      const usersExist = await checkIfUsersExist();
      
      if (!usersExist) {
        return res.redirect('/setup-account');
      }

      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();

      res.render('signup', {
        title: 'Sign Up',
        error: null,
        success: null,
        recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
      });
    } catch (error) {
      console.error('Error loading signup page:', error);
      res.render('signup', {
        title: 'Sign Up',
        error: 'System error. Please try again.',
        success: null,
        recaptchaSiteKey: null
      });
    }
  }

  /**
   * Process signup
   */
  static async processSignup(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();
      
      return res.render('signup', {
        title: 'Sign Up',
        error: errors.array()[0].msg,
        success: null,
        recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
      });
    }

    const { username, password, user_role } = req.body;
    const recaptchaResponse = req.body['g-recaptcha-response'];

    try {
      const AppSettings = require('../models/AppSettings');
      const recaptchaSettings = await AppSettings.getRecaptchaSettings();

      // Verify reCAPTCHA if enabled
      if (recaptchaSettings.hasKeys && recaptchaSettings.enabled) {
        if (!recaptchaResponse) {
          return res.render('signup', {
            title: 'Sign Up',
            error: 'Please complete the reCAPTCHA verification',
            success: null,
            recaptchaSiteKey: recaptchaSettings.siteKey
          });
        }

        const secretKey = decrypt(recaptchaSettings.secretKey);
        const axios = require('axios');
        const verifyResponse = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(recaptchaResponse)}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        if (!verifyResponse.data.success) {
          return res.render('signup', {
            title: 'Sign Up',
            error: 'reCAPTCHA verification failed. Please try again.',
            success: null,
            recaptchaSiteKey: recaptchaSettings.siteKey
          });
        }
      }

      // Check if username exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.render('signup', {
          title: 'Sign Up',
          error: 'Username already exists',
          success: null,
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }

      // Handle avatar
      let avatarPath = null;
      if (req.file) {
        avatarPath = `/uploads/avatars/${req.file.filename}`;
      }

      // Create user with trial status
      const newUser = await User.create({
        username,
        password,
        avatar_path: avatarPath,
        user_role: user_role || 'member',
        status: 'trial',
        disk_limit: 2147483648 // 2GB default
      });

      if (newUser) {
        return res.render('signup', {
          title: 'Sign Up',
          error: null,
          success: 'Account created successfully! Masa Trial 24 Jam Anda telah dimulai. Silakan Login.',
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      } else {
        return res.render('signup', {
          title: 'Sign Up',
          error: 'Failed to create account. Please try again.',
          success: null,
          recaptchaSiteKey: recaptchaSettings.hasKeys && recaptchaSettings.enabled ? recaptchaSettings.siteKey : null
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      return res.render('signup', {
        title: 'Sign Up',
        error: 'An error occurred during registration. Please try again.',
        success: null,
        recaptchaSiteKey: null
      });
    }
  }

  /**
   * Show setup account page
   */
  static async showSetupAccount(req, res) {
    try {
      const { checkIfUsersExist } = require('../db/database');
      const usersExist = await checkIfUsersExist();
      
      if (usersExist && !req.session.userId) {
        return res.redirect('/login');
      }
      
      if (req.session.userId) {
        const user = await User.findById(req.session.userId);
        if (user && user.username) {
          return res.redirect('/dashboard');
        }
      }

      res.render('setup-account', {
        title: 'Complete Your Account',
        user: req.session.userId ? await User.findById(req.session.userId) : {},
        error: null
      });
    } catch (error) {
      console.error('Setup account page error:', error);
      res.redirect('/login');
    }
  }

  /**
   * Process setup account
   */
  static async processSetupAccount(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('setup-account', {
        title: 'Complete Your Account',
        user: { username: req.body.username || '' },
        error: errors.array()[0].msg
      });
    }

    try {
      // Check if username is taken
      const existingUsername = await User.findByUsername(req.body.username);
      if (existingUsername) {
        return res.render('setup-account', {
          title: 'Complete Your Account',
          user: { username: req.body.username || '' },
          error: 'Username is already taken'
        });
      }

      const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
      const { checkIfUsersExist } = require('../db/database');
      const usersExist = await checkIfUsersExist();
      
      if (!usersExist) {
        // First user - create as admin
        const user = await User.create({
          username: req.body.username,
          password: req.body.password,
          avatar_path: avatarPath,
          user_role: 'admin',
          status: 'active'
        });

        req.session.userId = user.id;
        req.session.username = req.body.username;
        req.session.user_role = user.user_role;
        if (avatarPath) {
          req.session.avatar_path = avatarPath;
        }

        return res.redirect('/welcome');
      } else {
        // Update existing user
        await User.update(req.session.userId, {
          username: req.body.username,
          password: req.body.password,
          avatar_path: avatarPath
        });

        req.session.username = req.body.username;
        if (avatarPath) {
          req.session.avatar_path = avatarPath;
        }

        res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('Account setup error:', error);
      res.render('setup-account', {
        title: 'Complete Your Account',
        user: { username: req.body.username || '' },
        error: 'An error occurred. Please try again.'
      });
    }
  }
}

module.exports = AuthController;
