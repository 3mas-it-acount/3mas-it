const express = require('express');
const { Errand } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all errands for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    let where = {};
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
      where.userId = req.user.id;
    }
    const errands = await Errand.findAll({ where });
    res.json(errands);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errands', message: error.message });
  }
});

// Add a new errand
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { reason, location, requestDate, requesterName, requesterEmail, requesterPhone, status, description } = req.body;
    const errand = await Errand.create({
      userId: req.user.id,
      reason,
      location,
      requestDate,
      requesterName,
      requesterEmail,
      requesterPhone,
      status,
      description
    });
    req.app.get('io')?.emit('entityUpdated', { type: 'errand', action: 'add', data: errand });
    res.status(201).json(errand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add errand', message: error.message });
  }
});

// Edit an errand
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, location, requestDate, requesterName, requesterEmail, requesterPhone, status, description } = req.body;
    const errand = await Errand.findOne({ where: { id, userId: req.user.id } });
    if (!errand) return res.status(404).json({ error: 'Errand not found' });
    errand.reason = reason;
    errand.location = location;
    errand.requestDate = requestDate;
    errand.requesterName = requesterName;
    errand.requesterEmail = requesterEmail;
    errand.requesterPhone = requesterPhone;
    errand.status = status;
    errand.description = description;
    await errand.save();
    req.app.get('io')?.emit('entityUpdated', { type: 'errand', action: 'update', data: errand });
    res.json(errand);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update errand', message: error.message });
  }
});

// Delete an errand
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const errand = await Errand.findOne({ where: { id, userId: req.user.id } });
    if (!errand) return res.status(404).json({ error: 'Errand not found' });
    await errand.destroy();
    req.app.get('io')?.emit('entityUpdated', { type: 'errand', action: 'delete', id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete errand', message: error.message });
  }
});

module.exports = router; 