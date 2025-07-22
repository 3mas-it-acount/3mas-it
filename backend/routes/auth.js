const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register a new user (only admin can register new users)
router.post('/register',
  authenticateToken,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can register new users' });
    }
    next();
  },
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 5 }),
  body('role').isIn(['admin', 'user']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { username, email, password, role, firstName, lastName, department } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        role,
        firstName,
        lastName,
        department
      });
      res.status(201).json(newUser);
    } catch (error) {
      res.status(500).json({ error: 'Registration failed', message: error.message });
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail(),
  body('password').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: 'Login failed', message: error.message });
    }
  }
);

// Get logged-in user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
