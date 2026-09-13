const mongoose = require('mongoose');

const registrySchema = new mongoose.Schema({
  policeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  station: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Registry', registrySchema);
