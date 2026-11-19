const mongoose = require('mongoose');

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ServiceCategory', serviceCategorySchema);
