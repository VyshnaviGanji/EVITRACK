const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
  caseId: {
    type: String,
    required: true
  },
  evidenceName: {
    type: String,
    required: true
  },
  evidenceType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio'],
    required: true
  },
  description: String,
  fileName: String,
  filePath: {
    type: String,
    required: true
  },
  fileSize: Number,
  // NOTE: fileHash is NOT stored here - only on blockchain!
  evidenceId: {
    type: String,
    required: true,
    unique: true
  },
  transactionId: {
    type: String,
    required: true
  },
  blockNumber: Number,
  explorerUrl: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Officer',
    required: true
  },
  uploadedByName: String,
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'tampered'],
    default: 'pending'
  },
  lastVerified: Date,
  verificationCount: {
    type: Number,
    default: 0
  },
  isTampered: {
    type: Boolean,
    default: false
  },
  custodyChain: [
    {
      action: { type: String, enum: ['uploaded', 'verified', 'downloaded'] },
      officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
      officerName: String,
      timestamp: { type: Date, default: Date.now },
      result: String,
      note: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
evidenceSchema.index({ caseId: 1 });
evidenceSchema.index({ uploadedBy: 1, createdAt: -1 });
evidenceSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Evidence', evidenceSchema);
