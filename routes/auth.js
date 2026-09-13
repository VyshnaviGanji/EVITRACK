const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Officer = require('../models/Officer');
const Registry = require('../models/Registry');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, policeId, department, station, phoneNumber } = req.body;

    console.log('Registration attempt:', { name, email, policeId, department });

    // Validate required fields
    if (!name || !email || !password || !policeId || !department) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain at least one number' });
    }

    // Check if police ID exists in registry
    const registryEntry = await Registry.findOne({ policeId, status: 'approved' });
    if (!registryEntry) {
      console.log('Police ID not found in registry:', policeId);
      return res.status(403).json({ message: 'Police ID not found in registry. Please use PID001-PID005.' });
    }

    // Check if officer already exists
    const existingOfficer = await Officer.findOne({ $or: [{ email }, { policeId }] });
    if (existingOfficer) {
      return res.status(400).json({ message: 'Officer with this email or Police ID already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create officer
    const officer = new Officer({
      name,
      email,
      password: hashedPassword,
      policeId,
      department,
      station: station || '',
      phoneNumber: phoneNumber || ''
    });

    await officer.save();
    console.log('✅ Officer registered successfully:', email);

    res.status(201).json({ 
      message: 'Registration successful',
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        policeId: officer.policeId,
        department: officer.department
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if admin credentials (from .env)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
      if (password !== adminPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      // Issue admin token - no DB needed
      const token = jwt.sign(
        { id: 'admin', policeId: 'ADMIN', isAdmin: true },
        process.env.JWT_SECRET || 'default_secret',
        { expiresIn: '24h' }
      );
      return res.json({
        message: 'Login successful',
        token,
        officer: {
          id: 'admin',
          name: 'Administrator',
          email: adminEmail,
          policeId: 'ADMIN',
          department: 'System',
          isAdmin: true
        }
      });
    }

    // Regular officer login
    console.log('Login attempt:', email);
    const officer = await Officer.findOne({ email });
    if (!officer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, officer.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    officer.lastLogin = new Date();
    await officer.save();

    const token = jwt.sign(
      { id: officer._id, policeId: officer.policeId },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful:', email);

    res.json({
      message: 'Login successful',
      token,
      officer: {
        id: officer._id,
        name: officer.name,
        email: officer.email,
        policeId: officer.policeId,
        department: officer.department,
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
