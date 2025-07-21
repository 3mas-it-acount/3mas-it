const express = require('express');
const router = express.Router();
const { ManagerPermission, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Assign permission to a manager
router.post('/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { managerId, resourceType, resourceName } = req.body;
    if (!managerId || !resourceType || !resourceName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if user is a manager
    const user = await User.findByPk(managerId);
    if (!user || user.role !== 'manager') {
      return res.status(400).json({ error: 'User is not a manager' });
    }
    // Prevent duplicate permissions
    const exists = await ManagerPermission.findOne({ where: { managerId, resourceType, resourceName } });
    if (exists) {
      return res.status(400).json({ error: 'Permission already exists' });
    }
    const perm = await ManagerPermission.create({ managerId, resourceType, resourceName });
    res.status(201).json(perm);
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign permission', message: error.message });
  }
});

// List permissions for a manager
router.get('/:managerId', authenticateToken, async (req, res) => {
  console.log('User:', req.user, 'Requested managerId:', req.params.managerId);
  // Only allow if admin, or the manager is requesting their own permissions
  if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.managerId)) {
    return res.status(403).json({ error: 'Access denied', message: 'Admin privileges required' });
  }
  try {
    const { managerId } = req.params;
    const perms = await ManagerPermission.findAll({ where: { managerId } });
    res.json(perms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch permissions', message: error.message });
  }
});

// Remove a permission from a manager
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const perm = await ManagerPermission.findByPk(id);
    if (!perm) return res.status(404).json({ error: 'Permission not found' });
    await perm.destroy();
    res.json({ message: 'Permission removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove permission', message: error.message });
  }
});

module.exports = router; 