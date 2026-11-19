const mongoose = require('mongoose');

const providerApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected'],
    default: 'draft',
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true, default: {} },
  rejectionReason: { type: String, trim: true, maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

providerApplicationSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('ProviderApplication', providerApplicationSchema);
