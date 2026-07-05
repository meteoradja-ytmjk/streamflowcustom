const User = require('../models/User');
const Stream = require('../models/Stream');
const { db } = require('../db/database');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

/**
 * Admin Controller
 * Handles admin user management
 */

class AdminController {
  /**
   * Show users management page
   */
  static async showUsersPage(req, res) {
    try {
      const users = await User.findAll();

      // Get stats for each user
      const usersWithStats = await Promise.all(users.map(async (user) => {
        const videoStats = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalSize 
             FROM videos WHERE user_id = ?`,
            [user.id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        const streamStats = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count FROM streams WHERE user_id = ?`,
            [user.id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        const activeStreamStats = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count FROM streams WHERE user_id = ? AND status = 'live'`,
            [user.id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        return {
          ...user,
          videoCount: videoStats.count,
          diskUsage: videoStats.totalSize,
          streamCount: streamStats.count,
          activeStreamCount: activeStreamStats.count
        };
      }));

      res.render('users', {
        title: 'User Management',
        active: 'users',
        users: usersWithStats
      });
    } catch (error) {
      console.error('Error loading users page:', error);
      res.redirect('/dashboard');
    }
  }

  /**
   * Get all users with stats (API)
   */
  static async getUsers(req, res) {
    try {
      const users = await User.findAll();

      const usersWithStats = await Promise.all(users.map(async (user) => {
        const diskUsage = await User.getDiskUsage(user.id);
        const streamCount = await new Promise((resolve, reject) => {
          db.get(
            'SELECT COUNT(*) as count FROM streams WHERE user_id = ?',
            [user.id],
            (err, row) => {
              if (err) reject(err);
              else resolve(row.count);
            }
          );
        });

        return {
          ...user,
          diskUsage,
          streamCount
        };
      }));

      res.json({ success: true, users: usersWithStats });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  }

  /**
   * Get user streams
   */
  static async getUserStreams(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const userId = req.params.id;
      const streams = await Stream.findAll(userId);

      res.json({ success: true, streams });
    } catch (error) {
      console.error('Error fetching user streams:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch user streams' });
    }
  }

  /**
   * Create new user
   */
  static async createUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { username, password, role = 'user', status = 'active', diskLimit = 0 } = req.body;

      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const userData = {
        username,
        password: hashedPassword,
        role,
        status,
        disk_limit: parseInt(diskLimit) || 0
      };

      // Handle avatar upload
      if (req.file) {
        userData.avatar_path = `/uploads/avatars/${req.file.filename}`;
      }

      const user = await User.create(userData);

      res.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ success: false, error: 'Failed to create user' });
    }
  }

  /**
   * Update user
   */
  static async updateUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { userId, username, password, role, status, diskLimit } = req.body;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Prevent admin from demoting themselves
      if (userId === req.session.userId && role === 'user' && user.role === 'admin') {
        return res.status(400).json({
          success: false,
          error: 'You cannot demote yourself from admin'
        });
      }

      const updateData = {};

      // Update username if provided and different
      if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: 'Username already taken'
          });
        }
        updateData.username = username;
      }

      // Update password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (diskLimit !== undefined) updateData.disk_limit = parseInt(diskLimit);

      // Handle avatar upload
      if (req.file) {
        // Delete old avatar
        if (user.avatar_path && user.avatar_path !== '/images/default-avatar.jpg') {
          const oldAvatarPath = path.join(__dirname, '..', 'public', user.avatar_path);
          if (fs.existsSync(oldAvatarPath)) {
            fs.unlinkSync(oldAvatarPath);
          }
        }
        updateData.avatar_path = `/uploads/avatars/${req.file.filename}`;
      }

      await User.update(userId, updateData);

      res.json({
        success: true,
        message: 'User updated successfully'
      });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ success: false, error: 'Failed to update user' });
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { userId, status } = req.body;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Prevent admin from deactivating themselves
      if (userId === req.session.userId && status === 'inactive') {
        return res.status(400).json({
          success: false,
          error: 'You cannot deactivate your own account'
        });
      }

      await User.update(userId, { status });

      res.json({
        success: true,
        message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ success: false, error: 'Failed to update user status' });
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { userId, role } = req.body;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Prevent admin from demoting themselves
      if (userId === req.session.userId && role === 'user' && user.role === 'admin') {
        return res.status(400).json({
          success: false,
          error: 'You cannot demote yourself from admin'
        });
      }

      await User.update(userId, { role });

      res.json({
        success: true,
        message: `User role updated to ${role} successfully`
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        error: errors.array()[0].msg 
      });
    }

    try {
      const { userId } = req.body;

      // Prevent admin from deleting themselves
      if (userId === req.session.userId) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account'
        });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Delete user (this should cascade delete related records based on DB schema)
      await User.delete(userId);

      // Delete user's avatar if exists
      if (user.avatar_path && user.avatar_path !== '/images/default-avatar.jpg') {
        const avatarPath = path.join(__dirname, '..', 'public', user.avatar_path);
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
  }
}

module.exports = AdminController;
