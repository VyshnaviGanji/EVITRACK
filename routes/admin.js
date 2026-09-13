const express = require('express');
const router = express.Router();
const Officer = require('../models/Officer');
const Evidence = require('../models/Evidence');
const ActivityLog = require('../models/ActivityLog');
const Case = require('../models/Case');
const { adminMiddleware } = require('../middleware/auth');

// System stats
router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const totalOfficers = await Officer.countDocuments({ isAdmin: false });
    const totalEvidence = await Evidence.countDocuments();
    const verifiedEvidence = await Evidence.countDocuments({ verificationStatus: 'verified' });
    const tamperedEvidence = await Evidence.countDocuments({ verificationStatus: 'tampered' });
    const totalActions = await ActivityLog.countDocuments();
    const totalCases = await Case.countDocuments();
    res.json({ totalOfficers, totalEvidence, verifiedEvidence, tamperedEvidence, totalActions, totalCases });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// All cases (admin sees everything)
router.get('/cases', adminMiddleware, async (req, res) => {
  try {
    const cases = await Case.find().sort({ createdAt: -1 });
    const casesWithCount = await Promise.all(cases.map(async (c) => {
      const count = await Evidence.countDocuments({ caseId: c.caseId });
      return { ...c.toObject(), evidenceCount: count };
    }));
    res.json(casesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// All officers
router.get('/officers', adminMiddleware, async (req, res) => {
  try {
    const officers = await Officer.find({ isAdmin: false })
      .select('-password -sessionToken -__v')
      .sort({ createdAt: -1 });
    res.json(officers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Activity log
router.get('/activity', adminMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .select('-__v');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
