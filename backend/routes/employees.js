const express = require('express');
const { body, validationResult } = require('express-validator');
const { Employee } = require('../models');
const { authenticateToken, requireAdminOrManager } = require('../middleware/auth');
const { Sequelize } = require('sequelize');

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const location = req.query.location;
    const status = req.query.status;
    let where = {};
    if (location) where.location = location;
    if (status) where.status = status;
    // Optionally add search by fullName or email
    if (req.query.search) {
      where[Sequelize.Op.or] = [
        { fullName: { [Sequelize.Op.like]: `%${req.query.search}%` } },
        { email: { [Sequelize.Op.like]: `%${req.query.search}%` } }
      ];
    }
    const { count, rows } = await Employee.findAndCountAll({
      where,
      limit,
      offset,
      order: [['fullName', 'ASC']]
    });
    res.json({
      employees: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalEmployees: count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees', message: error.message });
  }
});

// Get specific employee
router.get('/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee', message: error.message });
  }
});

// Create new employee (admin only)
router.post('/',
  authenticateToken,
  requireAdminOrManager,
  body('employeeId').notEmpty(),
  body('fullName').notEmpty(),
  body('email').isEmail(),
  body('emailPass').notEmpty(),
  body('location').isIn(['factor', 'maadi', 'oroba', 'mansoria', 'banisuef']),
  body('position').notEmpty(),
  body('status').optional().isIn(['active', 'inactive']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        employeeId,
        fullName,
        email,
        emailPass,
        phone,
        device,
        location,
        position,
        systemCode,
        systemPass1,
        systemPass2,
        status
      } = req.body;
      // Check if employee ID already exists
      const existingEmployee = await Employee.findOne({ where: { employeeId } });
      if (existingEmployee) {
        return res.status(400).json({ error: 'Employee with this ID already exists' });
      }
      const employee = await Employee.create({
        employeeId,
        fullName,
        email,
        emailPass,
        phone,
        device: device || {},
        location,
        position,
        systemCode,
        systemPass1,
        systemPass2,
        status: status || 'active'
      });
      // Emit real-time event for employee creation
      req.app.get('io')?.emit('employeeCreated', employee);
      res.status(201).json(employee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create employee', message: error.message });
    }
  }
);

// Update employee (admin only)
router.put('/:id',
  authenticateToken,
  requireAdminOrManager,
  body('email').optional().isEmail(),
  body('fullName').optional().notEmpty(),
  body('emailPass').optional().notEmpty(),
  body('location').optional().isIn(['factor', 'maadi', 'oroba', 'mansoria', 'banisuef']),
  body('position').optional().notEmpty(),
  body('status').optional().isIn(['active', 'inactive']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const employee = await Employee.findByPk(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }
      const updateData = { ...req.body };
      // Only allow updating these fields
      const allowedFields = ['fullName','email','emailPass','phone','device','location','position','systemCode','systemPass1','systemPass2','status'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) delete updateData[key];
      });
      await employee.update(updateData);
      // Emit real-time event for employee update
      req.app.get('io')?.emit('employeeUpdated', employee);
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update employee', message: error.message });
    }
  }
);

// Delete employee (admin only)
router.delete('/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    await employee.destroy();
    // Emit real-time event for employee deletion
    req.app.get('io')?.emit('employeeDeleted', { id: req.params.id });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee', message: error.message });
  }
});

// Get positions list
router.get('/positions/list', authenticateToken, async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const positions = await Employee.findAll({
      attributes: ['position'],
      group: ['position'],
      where: {
        position: {
          [Op.ne]: null
        }
      }
    });
    
    const positionList = positions.map(emp => emp.position).filter(Boolean);
    res.json(positionList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions', message: error.message });
  }
});

module.exports = router;
