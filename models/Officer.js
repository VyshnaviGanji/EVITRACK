const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  policeId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  station: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  sessionToken: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
officerSchema.index({ email: 1 });
officerSchema.index({ policeId: 1 });

module.exports = mongoose.model('Officer', officerSchema);
