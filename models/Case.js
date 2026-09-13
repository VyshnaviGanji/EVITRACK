const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['open', 'under_investigation', 'closed'],
    default: 'open'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Officer' },
  createdByName: String,
  // Officers assigned to this case (by their DB _id)
  assignedOfficers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Officer' }],
  assignedOfficerNames: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

caseSchema.index({ caseId: 1 });
caseSchema.index({ assignedOfficers: 1 });
module.exports = mongoose.model('Case', caseSchema);
