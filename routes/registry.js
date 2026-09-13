const express = require('express');
const router = express.Router();
const Registry = require('../models/Registry');
const { authMiddleware } = require('../middleware/auth');

// Add officer to registry (admin function)
router.post('/add', async (req, res) => {
  try {
    const { policeId, name, station, status } = req.body;

    const existingEntry = await Registry.findOne({ policeId });
    if (existingEntry) {
      return res.status(400).json({ message: 'Police ID already in registry' });
    }

    const registryEntry = new Registry({
      policeId,
      name,
      station,
      status: status || 'approved'
    });

    await registryEntry.save();

    res.status(201).json({ message: 'Officer added to registry', registryEntry });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if police ID exists
router.get('/check/:policeId', async (req, res) => {
  try {
    const registryEntry = await Registry.findOne({ 
      policeId: req.params.policeId,
      status: 'approved'
    });

    res.json({ 
      exists: !!registryEntry,
      entry: registryEntry 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
