const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const Officer = require('../models/Officer');
const { authMiddleware } = require('../middleware/auth');

// Helper: check if officer is assigned to case
function isAssigned(c, officerId) {
  return c.assignedOfficers.some(id => id.toString() === officerId.toString());
}

// Create case - creator is auto-assigned, can add others by Police ID
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { caseId, title, description, assignPoliceIds } = req.body;
    if (!caseId || !title) return res.status(400).json({ message: 'Case ID and title are required' });

    const existing = await Case.findOne({ caseId: caseId.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'Case ID already exists' });

    // Start with the creator
    const assignedOfficers = [req.officer.id];
    const assignedOfficerNames = [req.officer.name];

    // Add extra officers by Police ID if provided
    if (assignPoliceIds && assignPoliceIds.length > 0) {
      const ids = assignPoliceIds.map(p => p.trim().toUpperCase()).filter(Boolean);
      const officers = await Officer.find({ policeId: { $in: ids } }).select('_id name policeId');
      officers.forEach(o => {
        if (o._id.toString() !== req.officer.id.toString()) {
          assignedOfficers.push(o._id);
          assignedOfficerNames.push(o.name);
        }
      });
    }

    const newCase = await Case.create({
      caseId: caseId.toUpperCase(),
      title,
      description,
      createdBy: req.officer.id,
      createdByName: req.officer.name,
      assignedOfficers,
      assignedOfficerNames
    });

    res.status(201).json(newCase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get only cases this officer is assigned to
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const cases = await Case.find({ assignedOfficers: req.officer.id }).sort({ createdAt: -1 });

    const casesWithCount = await Promise.all(cases.map(async (c) => {
      const count = await Evidence.countDocuments({ caseId: c.caseId });
      return { ...c.toObject(), evidenceCount: count };
    }));

    res.json(casesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single case - only if assigned
router.get('/:caseId', authMiddleware, async (req, res) => {
  try {
    const c = await Case.findOne({ caseId: req.params.caseId.toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (!isAssigned(c, req.officer.id)) return res.status(403).json({ message: 'Access denied' });

    const evidence = await Evidence.find({ caseId: c.caseId }).sort({ createdAt: -1 }).select('-__v');
    res.json({ ...c.toObject(), evidence });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update case status - only if assigned
router.patch('/:caseId/status', authMiddleware, async (req, res) => {
  try {
    const c = await Case.findOne({ caseId: req.params.caseId.toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (!isAssigned(c, req.officer.id)) return res.status(403).json({ message: 'Access denied' });

    c.status = req.body.status;
    c.updatedAt = new Date();
    await c.save();
    res.json(c);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add officer to case - only creator can do this
router.post('/:caseId/assign', authMiddleware, async (req, res) => {
  try {
    const c = await Case.findOne({ caseId: req.params.caseId.toUpperCase() });
    if (!c) return res.status(404).json({ message: 'Case not found' });
    if (c.createdBy.toString() !== req.officer.id.toString()) {
      return res.status(403).json({ message: 'Only the case creator can assign officers' });
    }

    const { policeId } = req.body;
    const officer = await Officer.findOne({ policeId: policeId.toUpperCase() });
    if (!officer) return res.status(404).json({ message: 'Officer not found with that Police ID' });

    if (isAssigned(c, officer._id)) {
      return res.status(400).json({ message: 'Officer already assigned to this case' });
    }

    c.assignedOfficers.push(officer._id);
    c.assignedOfficerNames.push(officer.name);
    await c.save();

    res.json({ message: `${officer.name} added to case`, case: c });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
