const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { upload } = require('../middleware/uploadMiddleware');
const rateLimit = require('express-rate-limit');
const {
  loginValidation,
  signupValidation,
  setupAccountValidation,
} = require('../middleware/validators/authValidator');

/**
 * Authentication Routes
 */

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('login', {
      title: 'Login',
      error: 'Too many login attempts. Please try again in 15 minutes.',
      recaptchaSiteKey: null
    });
  },
  requestWasSuccessful: (request, response) => {
    return response.statusCode < 400;
  }
});

// Login delay middleware (prevent brute force)
const loginDelayMiddleware = async (req, res, next) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  next();
};

// GET routes
router.get('/login', AuthController.showLogin);
router.get('/signup', AuthController.showSignup);
router.get('/setup-account', AuthController.showSetupAccount);
router.get('/logout', AuthController.logout);

// POST routes
router.post(
  '/login',
  loginDelayMiddleware,
  loginLimiter,
  loginValidation,
  AuthController.processLogin
);

router.post(
  '/signup',
  upload.single('avatar'),
  signupValidation,
  AuthController.processSignup
);

router.post(
  '/setup-account',
  upload.single('avatar'),
  setupAccountValidation,
  AuthController.processSetupAccount
);

module.exports = router;
