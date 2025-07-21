const express = require('express');
const router = express.Router();
const { SharedTask, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get all shared tasks (visible to all admins)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tasks = await SharedTask.findAll({
      include: [
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'completer', attributes: ['id', 'firstName', 'lastName', 'email'], foreignKey: 'completedBy', required: false }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shared tasks', message: error.message });
  }
});

// Create a new shared task (no assignedTo)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { text, frequency, notes } = req.body;
    if (!text || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newTask = await SharedTask.create({
      text: text.trim(),
      createdBy: req.user.id,
      frequency,
      completed: false,
      notes: notes || null
    });
    req.app.get('io')?.emit('sharedTaskCreated', newTask);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shared task', message: error.message });
  }
});

// Update a shared task (ignore assignedTo)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, frequency, completed, notes } = req.body;
    const task = await SharedTask.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    let updateData = {
      text: text ?? task.text,
      frequency: frequency ?? task.frequency,
      completed: completed ?? task.completed,
      notes: notes !== undefined ? notes : task.notes
    };
    // إذا تم اكتمال المهمة الآن
    if (completed === true || completed === 1 || completed === '1') {
      updateData.completedAt = new Date();
      updateData.completedBy = req.user.id;
      // سجل الاكتمال
      let history = [];
      if (task.completionHistory) {
        try { history = JSON.parse(task.completionHistory); } catch { history = []; }
      }
      history.push({ date: new Date(), userId: req.user.id });
      updateData.completionHistory = JSON.stringify(history);
    }
    await task.update(updateData);
    req.app.get('io')?.emit('sharedTaskUpdated', task);
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update shared task', message: error.message });
  }
});

// Delete a shared task
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await SharedTask.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await task.destroy();
    // Emit real-time event for shared task deletion
    req.app.get('io')?.emit('sharedTaskDeleted', { id });
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shared task', message: error.message });
  }
});

module.exports = router; 