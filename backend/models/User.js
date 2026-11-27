const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Invalid email address'],
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: { type: String }, // optional for Google users
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, unique: true, sparse: true },
  role: {
    type: String,
    // Provider access is an approval-gated capability; legacy provider values remain supported.
    enum: ['customer', 'provider', 'admin'],
    required: true,
  },
  providerStatus: {
    type: String,
    enum: ['not_applied', 'draft', 'pending', 'approved', 'rejected'],
    default: 'not_applied',
  },
  providerRejectionReason: { type: String, trim: true, maxlength: 1000 },
  dateOfBirth: { type: Date },
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean }, // undefined on existing accounts -> treated as verified
  emailVerifyCodeHash: { type: String },
  emailVerifyExpiresAt: { type: Date },
  resetPasswordTokenHash: { type: String },
  resetPasswordExpiresAt: { type: Date },
  loginOtpHash: { type: String },
  loginOtpExpiresAt: { type: Date },
  profileImage: { type: String },
  address: {
    formattedAddress: { type: String },
    street: { type: String },
    locality: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    pincode: { type: String },
    landmark: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] } // [longitude, latitude] — omitted until user sets location
  },
  // Provider Availability
  availability: {
    workingDays: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
    timeSlots: [{ type: String, trim: true }],
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '18:00' }
    },
    breaks: [{
      start: { type: String },
      end: { type: String }
    }],
    unavailableDates: [{ type: String }] // e.g., '2026-08-20'
  },
  // Provider Settings for Custom Requests
  openToCustomRequests: { type: Boolean, default: true },
  serviceRadius: { type: Number, default: 10 }, // in km
  // Provider Extended Profile
  profession: { type: String },
  about: { type: String },
  skills: [{ type: String }],
  serviceAreas: [{ type: String, trim: true }],
  experience: { type: Number, default: 0 }, // years
  city: { type: String },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for high-performance role lookups and geo discovery
userSchema.index({ location: '2dsphere' }, { sparse: true });
userSchema.index({ role: 1, providerStatus: 1, accountStatus: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
