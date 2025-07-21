const express = require('express');
const router = express.Router();
const { ErrandRequest, User } = require('../models');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

// Create a new errand request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { reason, location, requestDate, requesterName, requesterEmail, requesterPhone, description } = req.body;
    
    if (!reason || !location || !requestDate || !requesterName || !description) {
      return res.status(400).json({ message: 'All required fields are required.' });
    }

    const errandRequest = await ErrandRequest.create({
      reason,
      location,
      requestDate: new Date(requestDate),
      requesterName,
      requesterEmail,
      requesterPhone,
      description,
      requestedBy: req.user.id
    });

    // Emit real-time event for errand request creation
    req.app.get('io')?.emit('errandRequestCreated', errandRequest);
    
    res.status(201).json(errandRequest);
  } catch (err) {
    console.error('POST /api/errand-requests error:', err);
    res.status(500).json({ message: 'Failed to create errand request', error: err.message });
  }
});

// Get all errand requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    let where = {};
    
    // Non-admin users can only see their own errand requests
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      where = { requestedBy: req.user.id };
    }
    
    const requests = await ErrandRequest.findAll({
      where,
      include: [{ model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email', 'department'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (err) {
    console.error('GET /api/errand-requests error:', err);
    res.status(500).json({ message: 'Failed to fetch errand requests', error: err.message });
  }
});

// Update status (approve/reject) (admin/manager only)
router.put('/:id/status', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const request = await ErrandRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    request.status = status;
    await request.save();
    
    // Emit real-time event for errand request status update
    req.app.get('io')?.emit('errandRequestUpdated', request);
    
    res.json(request);
  } catch (err) {
    console.error('PUT /api/errand-requests/:id/status error:', err);
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

module.exports = router; 