const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String },

  // Pricing model
  pricingType: {
    type: String,
    enum: ['fixed', 'inspection', 'hourly'],
    required: true,
  },

  // Fixed pricing — complete service price
  fixedPrice: { type: Number },

  // Inspection/Quote pricing — upfront visit/inspection fee
  inspectionFee: { type: Number },

  // Hourly pricing
  visitFee: { type: Number },
  hourlyRate: { type: Number },
  billingIncrement: { type: Number, default: 60 }, // minutes: 30 or 60

  // Auto-computed base price for sorting & backward compat
  basePrice: { type: Number, required: true },

  // Service details & classification
  serviceKind: { type: String, trim: true, default: '' },
  estimatedDuration: { type: String, trim: true, default: '' },
  highlights: [{ type: String, trim: true }],

  // Service coverage & address (defaults to provider's base location when omitted)
  address: {
    formattedAddress: { type: String, trim: true, default: '' },
    street: { type: String, trim: true, default: '' },
    locality: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true, default: '' },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }, // [longitude, latitude]
  },
  serviceRadius: { type: Number, min: 1, max: 500, default: 10 },
  serviceAreas: [{ type: String, trim: true }],

  image: { type: String },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Validate pricing fields and auto-compute basePrice before validation
serviceSchema.pre('validate', function (next) {
  // Reject negative values
  const numFields = ['fixedPrice', 'inspectionFee', 'visitFee', 'hourlyRate', 'billingIncrement'];
  for (const field of numFields) {
    if (this[field] != null && this[field] < 0) {
      return next(new Error(`${field} cannot be negative.`));
    }
  }

  if (this.serviceRadius != null && (!Number.isFinite(this.serviceRadius) || this.serviceRadius < 1 || this.serviceRadius > 500)) {
    return next(new Error('Service radius must be between 1 and 500 km.'));
  }

  if (this.pricingType === 'fixed') {
    if (!this.fixedPrice || this.fixedPrice <= 0) {
      return next(new Error('Fixed price is required and must be greater than 0.'));
    }
    this.basePrice = this.fixedPrice;
  } else if (this.pricingType === 'inspection') {
    if (!this.inspectionFee || this.inspectionFee <= 0) {
      return next(new Error('Inspection/visit fee is required and must be greater than 0.'));
    }
    this.basePrice = this.inspectionFee;
  } else if (this.pricingType === 'hourly') {
    if (!this.visitFee || this.visitFee <= 0) {
      return next(new Error('Visit fee is required and must be greater than 0.'));
    }
    if (!this.hourlyRate || this.hourlyRate <= 0) {
      return next(new Error('Hourly rate is required and must be greater than 0.'));
    }
    if (this.billingIncrement && ![30, 60].includes(this.billingIncrement)) {
      return next(new Error('Billing increment must be 30 or 60 minutes.'));
    }
    this.basePrice = this.visitFee;
  }

  next();
});

serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ provider: 1, isActive: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ location: '2dsphere' }, { sparse: true });
serviceSchema.index({ 'address.pincode': 1, isActive: 1 });
serviceSchema.index({ 'address.city': 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
