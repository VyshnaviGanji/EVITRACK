const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get activity log (latest 100 entries) - ADMIN ONLY
router.get('/log', adminMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .select('-__v');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
