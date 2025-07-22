const express = require('express');
const { AnydeskDevice } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all Anydesk devices for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const devices = await AnydeskDevice.findAll({ where: { userId: req.user.id } });
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices', message: error.message });
  }
});

// Add a new device
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, anydeskId, branch, notes, password } = req.body;
    const device = await AnydeskDevice.create({
      userId: req.user.id,
      name,
      anydeskId,
      branch,
      notes,
      password
    });
    res.status(201).json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add device', message: error.message });
  }
});

// Edit a device
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, anydeskId, branch, notes, password } = req.body;
    const device = await AnydeskDevice.findOne({ where: { id, userId: req.user.id } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    device.name = name;
    device.anydeskId = anydeskId;
    device.branch = branch;
    device.notes = notes;
    device.password = password;
    await device.save();
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update device', message: error.message });
  }
});

// Delete a device
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const device = await AnydeskDevice.findOne({ where: { id, userId: req.user.id } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    await device.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete device', message: error.message });
  }
});

module.exports = router; 