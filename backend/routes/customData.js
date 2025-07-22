const express = require('express');
const { body, validationResult } = require('express-validator');
const { CustomDataTable } = require('../models');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');

const router = express.Router();

// Get all custom data tables
router.get('/', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const tables = await CustomDataTable.findAll();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom data tables', message: error.message });
  }
});

// Get specific custom data table
router.get('/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const table = await CustomDataTable.findByPk(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Custom data table not found' });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom data table', message: error.message });
  }
});

// Update custom data table
router.put('/:id',
  authenticateToken,
  requireAdminOrManager,
  body('tableName').optional().notEmpty(),
  body('tableData').optional().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const table = await CustomDataTable.findByPk(req.params.id);
      if (!table) {
        return res.status(404).json({ error: 'Custom data table not found' });
      }

      await table.update(req.body);
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update custom data table', message: error.message });
    }
  }
);

// Delete custom data table
router.delete('/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const table = await CustomDataTable.findByPk(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Custom data table not found' });
    }

    await table.destroy();
    res.json({ message: 'Custom data table deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete custom data table', message: error.message });
  }
});

// Re-add POST /custom-data with robust validation and error handling
router.post(
  '/',
  authenticateToken,
  requireAdminOrManager,
  body('tableName').trim().notEmpty().withMessage('Table name is required'),
  body('tableData').notEmpty().withMessage('Table data is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { tableName, tableData } = req.body;
      // Optionally validate tableData is valid JSON
      let parsedData;
      try {
        parsedData = typeof tableData === 'string' ? JSON.parse(tableData) : tableData;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid tableData JSON' });
      }
      const customTable = await CustomDataTable.create({
        tableName,
        tableData: JSON.stringify(parsedData),
        createdBy: req.user.id
      });
      res.status(201).json(customTable);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create custom data table', message: error.message });
    }
  }
);

module.exports = router;
