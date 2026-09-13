const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['upload', 'verify', 'download', 'login', 'logout'],
    required: true
  },
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
  officerName: String,
  evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Evidence' },
  evidenceName: String,
  caseId: String,
  result: String, // 'success', 'tampered', 'failed'
  details: String,
  createdAt: { type: Date, default: Date.now }
});

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ officerId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
