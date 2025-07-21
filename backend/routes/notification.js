const express = require('express');
const router = express.Router();
const { Notification, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get the latest notification (all users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      order: [['updated_at', 'DESC']],
      include: [{ model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] }]
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notification', message: error.message });
  }
});

// Set/update the notification (admin only, replaces previous)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      // If text is empty, delete all notifications
      await Notification.destroy({ where: {} });
      // Emit real-time event for notification cleared
      req.app.get('io')?.emit('notificationUpdated', null);
      return res.json({ message: 'Notification cleared' });
    }
    // Remove previous notifications
    await Notification.destroy({ where: {} });
    // Create new notification
    const notification = await Notification.create({
      text: text.trim(),
      createdBy: req.user.id
    });
    // Emit real-time event for notification update
    req.app.get('io')?.emit('notificationUpdated', notification);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to set notification', message: error.message });
  }
});

module.exports = router; 