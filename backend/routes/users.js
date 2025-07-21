const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, EmailConfig, UserSetting } = require('../models');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      users: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
});

// Get specific user (admin or own profile)
router.get('/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
});

// Create new user (admin only)
router.post('/',
  authenticateToken,
  requireAdminOrManager,
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['admin', 'manager', 'user']),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, password, role, firstName, lastName, department, phone } = req.body;
      
      // Check if user already exists
      const { Op } = require('sequelize');
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email },
            { username }
          ]
        }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email or username already exists' });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        department,
        phone
      });
      
      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      // Emit real-time event for user creation
      req.app.get('io')?.emit('userCreated', userResponse);
      res.status(201).json(userResponse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user', message: error.message });
    }
  }
);

// Update user (admin or own profile)
router.put('/:id',
  authenticateToken,
  requireOwnerOrAdmin,
  body('email').optional().isEmail(),
  body('firstName').optional().notEmpty(),
  body('lastName').optional().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, firstName, lastName, department, phone } = req.body;
      const userId = req.params.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Only admin can change role
      if (req.body.role && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admin can change user role' });
      }
      
      const updateData = {
        email: email || user.email,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        department: department || user.department,
        phone: phone || user.phone
      };
      
      // Only admin can update role
      if (req.body.role && req.user.role === 'admin') {
        updateData.role = req.body.role;
      }
      
      await user.update(updateData);
      
      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      // Emit real-time event for user update
      req.app.get('io')?.emit('userUpdated', userResponse);
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user', message: error.message });
    }
  }
);

// Change password (admin or own profile)
router.put('/:id/password',
  authenticateToken,
  requireOwnerOrAdmin,
  body('newPassword').isLength({ min: 6 }),
  body('currentPassword').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.params.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verify current password (admins can skip this for other users)
      if (req.user.role !== 'admin' || req.user.id === parseInt(userId)) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password: hashedPassword });
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update password', message: error.message });
    }
  }
);

// Admin change user password (admin only)
router.put('/:id/admin-password',
  authenticateToken,
  requireAdmin,
  body('newPassword').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { newPassword, currentPassword } = req.body;
      const userId = req.params.id;
      
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // If admin is changing their own password, require current password
      if (req.user.id === parseInt(userId)) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required when changing your own password' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password: hashedPassword });
      
      res.json({ message: 'Password updated successfully by admin' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update password', message: error.message });
    }
  }
);

// Deactivate user (admin only)
router.put('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ isActive: false });
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user', message: error.message });
  }
});

// Activate user (admin only)
router.put('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await user.update({ isActive: true });
    res.json({ message: 'User activated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate user', message: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // إذا كان المستخدم admin، تحقق من وجود أكثر من admin
    if (user.role === 'admin') {
      const adminCount = await User.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'لا يمكن حذف آخر مستخدم admin في النظام.' });
      }
    }
    await user.destroy();
    // Emit real-time event for user deletion
    req.app.get('io')?.emit('userDeleted', { id: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user', message: error.message });
  }
});

// Get current user's settings
router.get('/settings/me', authenticateToken, async (req, res) => {
  try {
    let settings = await UserSetting.findOne({ where: { userId: req.user.id } });
    if (!settings) {
      settings = await UserSetting.create({ userId: req.user.id });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user settings', message: error.message });
  }
});

// Update current user's settings
router.put('/settings/me', authenticateToken, async (req, res) => {
  try {
    let settings = await UserSetting.findOne({ where: { userId: req.user.id } });
    if (!settings) {
      settings = await UserSetting.create({ userId: req.user.id });
    }
    const { theme, notifications } = req.body;
    if (theme) settings.theme = theme;
    if (typeof notifications === 'boolean') settings.notifications = notifications;
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user settings', message: error.message });
  }
});

// Get minimal user list for sharing (all authenticated users)
router.get('/for-sharing', authenticateToken, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const users = await User.findAll({
      where: { id: { [Op.ne]: req.user.id } },
      attributes: ['id', 'firstName', 'lastName', 'email']
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users for sharing', message: error.message });
  }
});

module.exports = router;
