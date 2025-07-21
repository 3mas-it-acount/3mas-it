const express = require('express');
const router = express.Router();
const { PermissionRequest, User } = require('../models');
const { authenticateToken, requireAdmin, requireAdminOrManager } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { ManagerPermission } = require('../models');

// Multer setup for attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Create a new permission request (with optional attachment)
router.post('/', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    console.log('DEBUG req.body:', req.body);
    console.log('DEBUG req.file:', req.file);
    const { pageName, department, code } = req.body;
    if (!pageName || !department || !code) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    const attachment = req.file ? req.file.filename : null;
    const request = await PermissionRequest.create({
      pageName,
      department,
      code,
      requestedBy: req.user.id,
      attachment
    });
    // Emit real-time event for permission request creation
    req.app.get('io')?.emit('permissionCreated', request);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create permission request', error: err.message });
  }
});

// Get all permission requests (admin only)
router.get('/', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const requests = await PermissionRequest.findAll({
      include: [{ model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email', 'department'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (err) {
    console.error('GET /api/permissions error:', err);
    res.status(500).json({ message: 'Failed to fetch permission requests', error: err.message });
  }
});

// Update status (approve/reject) (admin only)
router.put('/:id/status', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const request = await PermissionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    request.status = status;
    await request.save();
    // Emit real-time event for permission status update
    req.app.get('io')?.emit('permissionUpdated', request);
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

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
router.get('/:managerId', authenticateToken, requireAdmin, async (req, res) => {
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