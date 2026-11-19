const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const connectDB = require('./db');
const User = require('./models/User');
const locationRoutes = require('./routes/location');
const addressRoutes = require('./routes/address');
const Service = require('./models/Service');
const ServiceCategory = require('./models/ServiceCategory');
const Booking = require('./models/Booking');
const ProviderApplication = require('./models/ProviderApplication');
const defaultServiceCategories = require('./constants/serviceCategories');
const CustomServiceRequest = require('./models/CustomServiceRequest');
const Quote = require('./models/Quote');
const Notification = require('./models/Notification');
const Review = require('./models/Review');
const { requireAuth, requireRole } = require('./middleware/auth');

dotenv.config({ path: path.join(__dirname, '.env') });

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const isObjectId = (value) => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const isValidTime = (value) => typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const isValidCoordinate = (latitude, longitude) => (
  latitude !== undefined && latitude !== null && latitude !== ''
  && longitude !== undefined && longitude !== null && longitude !== ''
  && Number.isFinite(Number(latitude))
  && Number.isFinite(Number(longitude))
  && Number(latitude) >= -90
  && Number(latitude) <= 90
  && Number(longitude) >= -180
  && Number(longitude) <= 180
);
const toPublicUser = (user) => {
  const publicUser = user.toObject();
  delete publicUser.password;
  if (publicUser.phone?.startsWith('email_')) publicUser.phone = '';
  if (publicUser.role === 'provider' && publicUser.providerStatus === 'not_applied') {
    publicUser.providerStatus = publicUser.verificationStatus || 'not_applied';
  }
  return publicUser;
};
const publicPhone = (phone) => (phone?.startsWith('email_') ? '' : phone || '');
const isApprovedProvider = (provider) => Boolean(provider && (
  provider.role !== 'admin'
  && (provider.providerStatus === 'approved'
    || (provider.role === 'provider'
      && provider.providerStatus === 'not_applied'
      && provider.verificationStatus === 'approved'))
));

const allowedOrigins = new Set(
  CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}
const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});
const setAuthCookie = (res, token) => res.cookie('token', token, authCookieOptions());
const clearAuthCookie = (res) => {
  const { maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie('token', clearOptions);
};

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(cookieParser());

// Setup Multer for simulated Cloud Storage (local uploads folder)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const privateUploadDir = path.join(__dirname, 'private_uploads');
if (!fs.existsSync(privateUploadDir)) {
  fs.mkdirSync(privateUploadDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const extension = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    }[file.mimetype];
    cb(null, `${crypto.randomBytes(16).toString('hex')}${extension}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, WebP, and GIF images are allowed.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

// Serve uploads statically
app.use('/uploads', express.static(uploadDir));

// Image Upload Endpoint (Simulates Cloud Storage)
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const photoUrl = `${process.env.API_URL || `${req.protocol}://${req.get('host')}`}/uploads/${req.file.filename}`;
  res.json({ success: true, photoUrl });
});

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, privateUploadDir),
  filename: (req, file, cb) => {
    const extension = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png' }[file.mimetype];
    cb(null, `${req.user.id}-${crypto.randomBytes(24).toString('hex')}${extension}`);
  },
});
const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) {
      const error = new Error('Only PDF, JPEG, and PNG documents are allowed.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  },
});

app.post('/api/provider-applications/documents', requireAuth, (req, res) => {
  documentUpload.single('document')(req, res, (err) => {
    if (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message || 'Document upload failed.' });
    }
    if (!req.file) return res.status(400).json({ success: false, message: 'A document is required.' });
    return res.status(201).json({
      success: true,
      documentUrl: `/api/provider-applications/documents/${req.file.filename}`,
    });
  });
});

app.get('/api/provider-applications/documents/:filename', requireAuth, async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}-[a-f0-9]{48}\.(?:pdf|jpg|png)$/.test(req.params.filename)) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    const documentUrl = `/api/provider-applications/documents/${req.params.filename}`;
    const application = await ProviderApplication.findOne({
      $or: [{ 'data.govtIdDocument': documentUrl }, { 'data.workProof': documentUrl }],
    }).select('user');
    if (!application || (application.user.toString() !== req.user.id && req.user.role !== 'admin')) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }
    return res.sendFile(path.join(privateUploadDir, req.params.filename), (err) => {
      if (err) next(err);
    });
  } catch (err) {
    return next(err);
  }
});

// Location & Address routes
app.use('/api/location', locationRoutes);
app.use('/api/addresses', addressRoutes);
app.get('/api/providers/nearby', (req, res, next) => {
  req.url = '/nearby' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  locationRoutes(req, res, next);
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('HomeFix API is running');
});

// ---------- Auth Routes ----------

// Register route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if ([name, email, password].some((value) => typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (!/.+@.+\..+/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: `email_${crypto.randomUUID()}`,
      password: hashed,
      role: 'customer',
      phoneVerified: false,
      verificationStatus: 'approved',
    });
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        providerStatus: user.providerStatus, verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error('[Register Error]', err.message);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      const msg = field === 'phone' ? 'This phone number is already registered.' : 'An account with this email already exists.';
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string'
      || !/.+@.+\..+/.test(email.trim()) || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const loginIdentifier = email.trim();
    const user = await User.findOne({ email: loginIdentifier.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this email.' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'This account is suspended.' });
    }
    if (user.role === 'provider' && user.verificationStatus === 'suspended') {
      return res.status(403).json({ success: false, message: 'This provider account is suspended.' });
    }
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    setAuthCookie(res, token);
    // Role is always from DB — frontend must redirect based on this, not its own state
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: publicPhone(user.phone),
        role: user.role,
        providerStatus: user.role === 'provider' && user.providerStatus === 'not_applied'
          ? user.verificationStatus
          : user.providerStatus,
        phoneVerified: user.phoneVerified,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (err) {
    console.error('[Login Error]', err.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    console.error('[Fetch Current User Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch current user.' });
  }
});

const providerApplicationFields = [
  'fullName', 'phone', 'email', 'profilePhoto', 'dateOfBirth', 'categories',
  'skills', 'experience', 'previousWork', 'certifications', 'city', 'state',
  'pincode', 'areas', 'radius', 'price', 'pricingModel', 'workingDays',
  'timeSlots', 'govtIdType', 'govtIdNumber', 'govtIdDocument', 'workProof',
  'latitude', 'longitude', 'formattedAddress',
];
const isOwnedProviderDocument = (url, userId) => {
  if (typeof url !== 'string') return false;
  const match = url.match(/^\/api\/provider-applications\/documents\/([a-f0-9]{24})-([a-f0-9]{48})\.(?:pdf|jpg|png)$/);
  return Boolean(match && match[1] === userId && fs.existsSync(path.join(privateUploadDir, url.split('/').pop())));
};
const cleanApplicationData = (data) => Object.fromEntries(
  providerApplicationFields.filter((field) => Object.hasOwn(data, field)).map((field) => [field, data[field]])
);
const validateProviderApplication = async (data, user) => {
  const requiredText = [
    'fullName', 'phone', 'email', 'profilePhoto', 'dateOfBirth', 'skills',
    'previousWork', 'city', 'state', 'pincode', 'areas',
    'govtIdType', 'govtIdNumber', 'govtIdDocument',
  ];
  if (requiredText.some((field) => typeof data[field] !== 'string' || !data[field].trim())) {
    return 'Complete all required application fields.';
  }
  if (data.fullName.trim().length > 120 || data.phone.trim().length > 32
    || data.profilePhoto.length > 2048 || data.govtIdNumber.trim().length > 100) {
    return 'One or more application fields are too long.';
  }
  if (data.email.trim().toLowerCase() !== user.email) {
    return 'Use the email address linked to your account.';
  }
  if (!isValidDate(data.dateOfBirth) || new Date(data.dateOfBirth) >= new Date()) {
    return 'Enter a valid date of birth in the past.';
  }
  await ensureServiceCategories();
  const activeCategories = await ServiceCategory.find({ isActive: true }).select('name').lean();
  const categoryNames = new Set(activeCategories.map((category) => category.name));
  if (!Array.isArray(data.categories) || !data.categories.length
    || data.categories.some((category) => !categoryNames.has(category))) {
    return 'Select at least one valid service category.';
  }
  if (Array.isArray(data.workingDays) && data.workingDays.some((day) => !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(day))) {
    return 'Select valid working days.';
  }
  if (!Number.isFinite(Number(data.experience)) || Number(data.experience) < 0 || Number(data.experience) > 60) {
    return 'Experience must be between 0 and 60 years.';
  }
  if (!Number.isFinite(Number(data.radius)) || Number(data.radius) < 1 || Number(data.radius) > 500) {
    return 'Service radius must be between 1 and 500 km.';
  }
  if (!/^\d{6}$/.test(data.pincode.trim())) return 'Enter a valid 6-digit PIN code.';
  if (!isOwnedProviderDocument(data.govtIdDocument, user._id.toString())) {
    return 'Upload a government ID document.';
  }
  if (data.workProof && !isOwnedProviderDocument(data.workProof, user._id.toString())) {
    return 'Upload work proof using the document upload field.';
  }
  const duplicatePhone = await User.findOne({ phone: data.phone.trim(), _id: { $ne: user._id } }).select('_id');
  if (duplicatePhone) return 'This phone number is already registered to another account.';
  return null;
};

app.get('/api/provider-applications/me', requireAuth, async (req, res) => {
  try {
    const application = await ProviderApplication.findOne({ user: req.user.id });
    const user = await User.findById(req.user.id)
      .select('role providerStatus verificationStatus providerRejectionReason');
    res.json({
      success: true,
      application: application || null,
      status: user.role === 'provider' && user.providerStatus === 'not_applied'
        ? user.verificationStatus
        : user.providerStatus,
      rejectionReason: application?.rejectionReason || user.providerRejectionReason || '',
    });
  } catch (err) {
    console.error('[Provider Application Fetch Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load your provider application.' });
  }
});

app.put('/api/provider-applications/me', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return res.status(400).json({ success: false, message: 'Application data must be an object.' });
    }
    const applicationData = cleanApplicationData(body.data);
    for (const [field, value] of Object.entries(applicationData)) {
      if (['categories', 'workingDays'].includes(field)) {
        if (!Array.isArray(value) || value.length > 20
          || value.some((item) => typeof item !== 'string' || item.length > 120)) {
          return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
        }
      } else if (['latitude', 'longitude'].includes(field)) {
        if (value !== '' && value !== null && value !== undefined && !Number.isFinite(Number(value))) {
          return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
        }
      } else if (typeof value !== 'string' || value.length > 5000) {
        return res.status(400).json({ success: false, message: `Invalid ${field} value.` });
      }
    }
    const user = await User.findById(req.user.id);
    if (!user || user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'This account cannot submit a provider application.' });
    }
    if (user.providerStatus === 'approved' || user.verificationStatus === 'suspended') {
      return res.status(409).json({ success: false, message: 'Approved or suspended provider applications cannot be edited.' });
    }
    let application = await ProviderApplication.findOne({ user: user._id });
    if (application?.status === 'pending') {
      return res.status(409).json({ success: false, message: 'Your application is awaiting review and cannot be edited.' });
    }
    if (!application) application = new ProviderApplication({ user: user._id, data: {} });
    application.data = { ...application.data, ...applicationData };
    application.status = 'draft';
    application.rejectionReason = undefined;
    await application.save();
    user.providerStatus = 'draft';
    user.providerRejectionReason = undefined;
    await user.save();
    res.json({ success: true, application, status: user.providerStatus });
  } catch (err) {
    console.error('[Provider Application Draft Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save your application draft.' });
  }
});

app.post('/api/provider-applications/me/submit', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const application = await ProviderApplication.findOne({ user: req.user.id });
    if (!user || user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'This account cannot submit a provider application.' });
    }
    if (!application || !['draft', 'rejected'].includes(application.status)) {
      return res.status(409).json({ success: false, message: 'Save a draft before submitting your application.' });
    }
    const validationMessage = await validateProviderApplication(application.data, user);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    application.status = 'pending';
    application.rejectionReason = undefined;
    application.reviewedBy = undefined;
    application.reviewedAt = undefined;
    await application.save();
    user.providerStatus = 'pending';
    user.providerRejectionReason = undefined;
    user.name = application.data.fullName.trim();
    user.phone = application.data.phone.trim();
    user.profileImage = application.data.profilePhoto;
    user.dateOfBirth = new Date(application.data.dateOfBirth);
    user.profession = application.data.categories[0];
    user.skills = application.data.categories;
    user.experience = Number(application.data.experience);
    user.about = application.data.previousWork;
    user.city = application.data.city.trim();
    user.serviceAreas = application.data.areas.split(',').map((area) => area.trim()).filter(Boolean);
    user.serviceRadius = Number(application.data.radius);
    const currentAvailability = user.availability ? user.availability.toObject() : {};
    user.availability = {
      workingDays: (Array.isArray(application.data.workingDays) && application.data.workingDays.length > 0)
        ? application.data.workingDays
        : (currentAvailability.workingDays?.length ? currentAvailability.workingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
      timeSlots: (typeof application.data.timeSlots === 'string' && application.data.timeSlots.trim())
        ? [application.data.timeSlots.trim()]
        : (currentAvailability.timeSlots?.length ? currentAvailability.timeSlots : ['09:00 AM–06:00 PM']),
      workingHours: {
        start: currentAvailability.workingHours?.start || '09:00',
        end: currentAvailability.workingHours?.end || '18:00',
      },
      breaks: currentAvailability.breaks || [],
      unavailableDates: currentAvailability.unavailableDates || [],
    };
    const currentAddress = user.address ? user.address.toObject() : {};
    const parsedLat = application.data.latitude !== undefined && application.data.latitude !== '' ? Number(application.data.latitude) : currentAddress.latitude;
    const parsedLng = application.data.longitude !== undefined && application.data.longitude !== '' ? Number(application.data.longitude) : currentAddress.longitude;
    user.address = {
      formattedAddress: application.data.formattedAddress || currentAddress.formattedAddress,
      street: currentAddress.street,
      locality: application.data.locality || currentAddress.locality,
      city: application.data.city.trim(),
      state: application.data.state.trim(),
      pincode: application.data.pincode.trim(),
      country: currentAddress.country || 'India',
      landmark: currentAddress.landmark,
      latitude: parsedLat,
      longitude: parsedLng,
    };
    if (parsedLat !== undefined && parsedLng !== undefined && !isNaN(parsedLat) && !isNaN(parsedLng)) {
      user.location = {
        type: 'Point',
        coordinates: [parsedLng, parsedLat],
      };
    }
    await user.save();
    res.json({ success: true, message: 'Provider application submitted for review.', application, status: user.providerStatus });
  } catch (err) {
    console.error('[Provider Application Submit Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit your application.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
});

// ---------- Helper: map service to frontend format ----------
function mapService(s) {
  const isRecent = s.createdAt && (Date.now() - new Date(s.createdAt).getTime()) < 14 * 24 * 60 * 60 * 1000;
  return {
    id: s._id.toString(),
    _id: s._id.toString(),
    name: s.name,
    category: s.category,
    description: s.description || '',
    price: s.basePrice,
    priceType: s.pricingType,
    pricingType: s.pricingType,
    fixedPrice: s.fixedPrice || null,
    inspectionFee: s.inspectionFee || null,
    visitFee: s.visitFee || null,
    hourlyRate: s.hourlyRate || null,
    billingIncrement: s.billingIncrement || 60,
    isActive: s.isActive !== undefined ? s.isActive : true,
    image: s.image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    provider: s.provider ? { id: (s.provider._id || s.provider).toString(), name: s.provider.name || '' } : null,
    rating: s.rating || 0,
    reviewCount: s.reviewCount || 0,
    createdAt: s.createdAt || null,
    isNew: Boolean(isRecent),
  };
}

// ---------- Services Routes ----------

const slugifyCategory = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ensureServiceCategories = async () => {
  if (await ServiceCategory.exists({})) return;
  const legacyCategories = await Service.distinct('category');
  const legacyNames = new Map([
    ['cleaning', 'Home Cleaning'],
    ['plumbing', 'Plumber'],
    ['electrical', 'Electrician'],
    ['carpentry', 'Carpenter'],
    ['appliances', 'Appliance Repair'],
    ['ac service', 'AC Repair'],
    ['painter', 'Painting'],
  ]);
  const categoryNames = [...new Set([
    ...defaultServiceCategories,
    ...legacyCategories.filter((name) => !legacyNames.has(name.trim().toLowerCase())),
  ])];
  try {
    await ServiceCategory.insertMany(categoryNames.map((name) => ({
      name,
      slug: slugifyCategory(name),
    })), { ordered: false });
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors?.every((writeError) => writeError.code === 11000)) throw err;
  }
  for (const [legacyName, canonicalName] of legacyNames) {
    await Service.updateMany({ category: new RegExp(`^${escapeRegex(legacyName)}$`, 'i') }, { $set: { category: canonicalName } });
  }
};

app.get('/api/service-categories', async (req, res) => {
  try {
    await ensureServiceCategories();
    const categories = await ServiceCategory.find({ isActive: true }).sort({ name: 1 }).select('name slug');
    res.json({ success: true, categories });
  } catch (err) {
    console.error('[Service Categories Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load service categories.' });
  }
});

app.get('/api/admin/service-categories', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureServiceCategories();
    const categories = await ServiceCategory.find().sort({ name: 1 }).lean();
    const counts = await Service.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countByName = new Map(counts.map(({ _id, count }) => [_id, count]));
    res.json({
      success: true,
      categories: categories.map((category) => ({
        ...category,
        serviceCount: countByName.get(category.name) || 0,
      })),
    });
  } catch (err) {
    console.error('[Admin Service Categories Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to load service categories.' });
  }
});

app.post('/api/admin/service-categories', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    await ensureServiceCategories();
    const body = req.body || {};
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Category name is required and must be 80 characters or fewer.' });
    }
    const name = body.name.trim();
    const slug = slugifyCategory(name);
    if (!slug) return res.status(400).json({ success: false, message: 'Category name must include letters or numbers.' });
    const category = await ServiceCategory.create({ name, slug });
    res.status(201).json({ success: true, category, message: 'Service category created.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This category already exists.' });
    console.error('[Create Service Category Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create service category.' });
  }
});

app.put('/api/admin/service-categories/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    if (!isObjectId(req.params.id)
      || (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80))
      || (body.isActive !== undefined && typeof body.isActive !== 'boolean')) {
      return res.status(400).json({ success: false, message: 'Provide a valid category name or active status.' });
    }
    const category = await ServiceCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Service category not found.' });
    if (body.name !== undefined && body.name.trim() !== category.name) {
      const oldName = category.name;
      category.name = body.name.trim();
      category.slug = slugifyCategory(category.name);
      if (!category.slug) {
        return res.status(400).json({ success: false, message: 'Category name must include letters or numbers.' });
      }
      const duplicate = await ServiceCategory.findOne({ slug: category.slug, _id: { $ne: category._id } }).select('_id');
      if (duplicate) return res.status(409).json({ success: false, message: 'This category already exists.' });
      await Service.updateMany({ category: oldName }, { $set: { category: category.name } });
    }
    if (body.isActive !== undefined) category.isActive = body.isActive;
    await category.save();
    res.json({ success: true, category, message: 'Service category updated.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This category already exists.' });
    console.error('[Update Service Category Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update service category.' });
  }
});

// Service Category Aliases for search and filter tolerance
const CATEGORY_ALIASES = {
  plumbing: 'Plumber',
  plumber: 'Plumber',
  electrical: 'Electrician',
  electrician: 'Electrician',
  electric: 'Electrician',
  cleaning: 'Home Cleaning',
  clean: 'Home Cleaning',
  'home cleaning': 'Home Cleaning',
  house: 'Home Cleaning',
  carpentry: 'Carpenter',
  carpenter: 'Carpenter',
  appliances: 'Appliance Repair',
  appliance: 'Appliance Repair',
  'appliance repair': 'Appliance Repair',
  painting: 'Painting',
  paint: 'Painting',
  painter: 'Painting',
  'pest control': 'Pest Control',
  pest: 'Pest Control',
  'salon at home': 'Salon at Home',
  salon: 'Salon at Home',
  'ac repair': 'AC Repair',
  ac: 'AC Repair',
};

// Services endpoint (public)
app.get('/api/services', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    if ((category !== undefined && typeof category !== 'string')
      || (search !== undefined && typeof search !== 'string')) {
      return res.status(400).json({ success: false, message: 'Category and search must be text.' });
    }
    if (search && search.length > 100) {
      return res.status(400).json({ success: false, message: 'Search must be 100 characters or fewer.' });
    }
    const query = { isActive: true };

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const terms = cleanSearch.toLowerCase().split(/\s+/).filter(Boolean);
      const orClauses = [];

      // Exact phrase match across fields
      const phraseRegex = new RegExp(escapeRegex(cleanSearch), 'i');
      orClauses.push({ name: phraseRegex }, { category: phraseRegex }, { description: phraseRegex });

      // Individual terms
      terms.forEach((term) => {
        const termRegex = new RegExp(escapeRegex(term), 'i');
        orClauses.push({ name: termRegex }, { category: termRegex }, { description: termRegex });

        if (CATEGORY_ALIASES[term]) {
          const catName = CATEGORY_ALIASES[term];
          orClauses.push({ category: new RegExp(`^${escapeRegex(catName)}$`, 'i') });
        }
      });

      // Domain-specific synonym keywords
      if (/fan|switch|breaker|mcb|wire|wiring|inverter|short/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Electrician$', 'i') });
      }
      if (/pipe|tap|drain|leak|water|flush|basin/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Plumber$', 'i') });
      }
      if (/wood|furniture|door|lock|table|chair|bed/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Carpenter$', 'i') });
      }
      if (/wash|mop|dust|vacuum|maid|sofa|carpet/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^Home Cleaning$', 'i') });
      }
      if (/cooling|filter|gas|compressor/i.test(cleanSearch)) {
        orClauses.push({ category: new RegExp('^(AC Repair|Appliance Repair)$', 'i') });
      }

      query.$or = orClauses;
    }

    await ensureServiceCategories();
    const activeCategoryNames = await ServiceCategory.distinct('name', { isActive: true });
    if (category && category.trim()) {
      const catTrim = category.trim().toLowerCase();
      const mappedName = CATEGORY_ALIASES[catTrim] || category.trim();
      const activeCategory = activeCategoryNames.find(
        (name) => name.toLowerCase() === mappedName.toLowerCase() || name.toLowerCase() === catTrim
      );
      if (!activeCategory) return res.json({ success: true, services: [] });
      query.category = activeCategory;
    } else {
      query.category = { $in: activeCategoryNames };
    }
    const services = await Service.find(query).sort({ createdAt: -1 }).populate('provider', 'name role providerStatus verificationStatus');
    const approvedServices = services.filter((service) => (
      isApprovedProvider(service.provider)
    ));
    const result = approvedServices.map(mapService);
    if (sort === 'newest') result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sort === 'price-low') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-high') result.sort((a, b) => b.price - a.price);
    if (sort === 'rating') result.sort((a, b) => b.rating - a.rating);
    if (sort === 'popular') result.sort((a, b) => ((b.rating * b.reviewCount) - (a.rating * a.reviewCount)));
    res.json({ success: true, services: result });
  } catch (err) {
    console.error('Fetch services error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch services.' });
  }
});

// Get Provider's Services endpoint (provider only) — must be above /:id so Express doesn't treat "me" as an ID
app.get('/api/services/me', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user.id });
    let result = services.map(mapService);
    res.json({ success: true, services: result });
  } catch (err) {
    console.error('Fetch provider services error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch your services.' });
  }
});

// Get single service by ID (public)
app.get('/api/services/:id', async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid service ID.' });
    }
    const service = await Service.findOne({ _id: req.params.id, isActive: true })
      .populate('provider', 'name role providerStatus verificationStatus');
    if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
    await ensureServiceCategories();
    if (!await ServiceCategory.exists({ name: service.category, isActive: true })) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    if (!isApprovedProvider(service.provider)) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    res.json({ success: true, service: mapService(service) });
  } catch (err) {
    console.error('Fetch single service error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch service.' });
  }
});

// Add Service endpoint (provider only)
app.post('/api/services', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const { name, category, description, pricingType, fixedPrice, inspectionFee, visitFee, hourlyRate, billingIncrement, image } = req.body;
    if (!name || !category || !pricingType) {
      return res.status(400).json({ success: false, message: 'Name, category, and pricing type are required.' });
    }
    await ensureServiceCategories();
    if (!await ServiceCategory.exists({ name: category, isActive: true })) {
      return res.status(400).json({ success: false, message: 'Select an active service category.' });
    }
    if (!['fixed', 'inspection', 'hourly'].includes(pricingType)) {
      return res.status(400).json({ success: false, message: 'Invalid pricing type.' });
    }
    // Build service data — basePrice is auto-computed by the model pre-validate hook
    const serviceData = { name, category, description, pricingType, image, provider: req.user.id, basePrice: 0 };
    const resolvedPrice = Number(fixedPrice !== undefined ? fixedPrice : (req.body.price !== undefined ? req.body.price : 0));
    if (pricingType === 'fixed') serviceData.fixedPrice = resolvedPrice;
    if (pricingType === 'inspection') serviceData.inspectionFee = Number(inspectionFee !== undefined ? inspectionFee : resolvedPrice);
    if (pricingType === 'hourly') {
      serviceData.visitFee = Number(visitFee !== undefined ? visitFee : resolvedPrice);
      serviceData.hourlyRate = Number(hourlyRate);
      serviceData.billingIncrement = Number(billingIncrement) || 60;
    }
    const newService = await Service.create(serviceData);
    res.status(201).json({ success: true, service: newService });
  } catch (err) {
    console.error('Create service error:', err);
    const msg = err.message || 'Failed to create service.';
    res.status(400).json({ success: false, message: msg });
  }
});

// Delete Service endpoint (provider only)
app.delete('/api/services/:id', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, provider: req.user.id });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or you do not have permission to delete it.' });
    }
    await Service.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Service deleted successfully.' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete service.' });
  }
});

// Edit Service endpoint (provider only)
app.put('/api/services/:id', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, provider: req.user.id });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found or access denied.' });
    const { name, category, description, image, pricingType, fixedPrice, inspectionFee, visitFee, hourlyRate, billingIncrement } = req.body;
    if (name) service.name = name;
    if (category) {
      await ensureServiceCategories();
      if (!await ServiceCategory.exists({ name: category, isActive: true })) {
        return res.status(400).json({ success: false, message: 'Select an active service category.' });
      }
      service.category = category;
    }
    if (description !== undefined) service.description = description;
    if (image !== undefined) service.image = image;
    if (pricingType !== undefined && !['fixed', 'inspection', 'hourly'].includes(pricingType)) {
      return res.status(400).json({ success: false, message: 'Invalid pricing type.' });
    }
    if (pricingType) {
      service.pricingType = pricingType;
      if (pricingType === 'fixed' && fixedPrice !== undefined) service.fixedPrice = Number(fixedPrice);
      if (pricingType === 'inspection' && inspectionFee !== undefined) service.inspectionFee = Number(inspectionFee);
      if (pricingType === 'hourly') {
        if (visitFee !== undefined) service.visitFee = Number(visitFee);
        if (hourlyRate !== undefined) service.hourlyRate = Number(hourlyRate);
        if (billingIncrement !== undefined) service.billingIncrement = Number(billingIncrement);
      }
    }
    await service.save();
    res.json({ success: true, service: mapService(service) });
  } catch (err) {
    console.error('Edit service error:', err);
    res.status(400).json({ success: false, message: err.message || 'Failed to update service.' });
  }
});

// Toggle Service Active/Inactive (provider only)
app.put('/api/services/:id/toggle', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, provider: req.user.id });
    if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
    service.isActive = !service.isActive;
    await service.save();
    res.json({ success: true, isActive: service.isActive, service: mapService(service) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle service.' });
  }
});

// Provider Dashboard Stats
app.get('/api/providers/me/stats', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const providerId = req.user.id;
    const allBookings = await Booking.find({ provider: providerId });
    const completedBookings = allBookings.filter(b => b.status === 'completed');

    // This month earnings
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthBookings = completedBookings.filter(b => new Date(b.createdAt) >= startOfMonth);
    const thisMonthEarnings = thisMonthBookings.reduce((sum, b) => sum + ((b.finalTotal || b.total) - (b.platformFee || 0)), 0);

    // Reviews / Rating from completed bookings (via Review model if exists, else mock)
    let avgRating = 0;
    let totalReviews = 0;
    try {
      const Review = require('./models/Review');
      const reviews = await Review.find({ providerId });
      totalReviews = reviews.length;
      if (totalReviews > 0) {
        avgRating = reviews.reduce((s, r) => s + r.rating, 0) / totalReviews;
      }
    } catch (e) { /* Review model may not exist yet */ }

    const servicesCount = await Service.countDocuments({ provider: providerId });

    res.json({
      success: true,
      stats: {
        totalBookings: allBookings.length,
        completedJobs: completedBookings.length,
        thisMonthEarnings: Math.round(thisMonthEarnings),
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        servicesCount,
        pendingBookings: allBookings.filter(b => b.status === 'pending').length,
        activeBookings: allBookings.filter(b => ['confirmed', 'upcoming', 'ongoing'].includes(b.status)).length,
      }
    });
  } catch (err) {
    console.error('[Provider Stats Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// Update Provider Availability (working days/hours/unavailable dates)
app.put('/api/providers/me/availability', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const { workingDays, startTime, endTime, unavailableDates } = req.body;
    const provider = await User.findById(req.user.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    if (!provider.availability) provider.availability = {};
    if (workingDays !== undefined) provider.availability.workingDays = workingDays;
    if (startTime || endTime) {
      provider.availability.workingHours = {
        start: startTime || provider.availability.workingHours?.start || '09:00',
        end: endTime || provider.availability.workingHours?.end || '18:00',
      };
    }
    if (unavailableDates !== undefined) provider.availability.unavailableDates = unavailableDates;
    provider.markModified('availability');
    await provider.save();
    res.json({ success: true, availability: provider.availability, message: 'Availability updated successfully.' });
  } catch (err) {
    console.error('[Availability Update Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update availability.' });
  }
});

// Get Provider Reviews
app.get('/api/providers/me/reviews', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    let reviews = [];
    let avgRating = 0;
    try {
      const Review = require('./models/Review');
      reviews = await Review.find({ providerId: req.user.id })
        .populate('customerId', 'name profileImage')
        .sort({ createdAt: -1 });
      if (reviews.length > 0) {
        avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      }
    } catch (e) { /* Review model may not exist */ }
    res.json({ success: true, reviews, avgRating: Math.round(avgRating * 10) / 10, totalReviews: reviews.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// Mark all notifications read
app.put('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications.' });
  }
});

// Provider Profile Update (name, profession, about, skills etc)
app.put('/api/providers/me/profile', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const { name, phone, profession, about, skills, experience, city, profileImage } = req.body;
    const provider = await User.findById(req.user.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });
    if (name) provider.name = name;
    if (phone) provider.phone = phone;
    if (profession !== undefined) provider.profession = profession;
    if (about !== undefined) provider.about = about;
    if (skills !== undefined) provider.skills = skills;
    if (experience !== undefined) provider.experience = experience;
    if (city) { provider.address = provider.address || {}; provider.address.city = city; provider.city = city; }
    if (profileImage !== undefined) provider.profileImage = profileImage;
    await provider.save();
    const safeUser = provider.toObject();
    delete safeUser.password;
    res.json({ success: true, user: safeUser, message: 'Profile updated.' });
  } catch (err) {
    console.error('[Provider Profile Update Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ---------- Bookings Routes (MongoDB) ----------

// Get bookings (role-aware: admin sees all, provider sees their jobs, customer sees their bookings)
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    let query = {};
    if (req.query.mode === 'provider') {
      if (req.user.providerStatus !== 'approved') {
        return res.status(403).json({ success: false, message: 'Provider approval is required.' });
      }
      query.provider = req.user.id;
    } else if (req.user.role !== 'admin') {
      query.customer = req.user.id;
    }
    // admin sees all

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate('service', 'name category image basePrice')
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone');

    const result = bookings.map(b => ({
      id: b.bookingId,
      _id: b._id.toString(),
      serviceName: b.serviceName,
      serviceCategory: b.serviceCategory || '',
      serviceImage: b.serviceImage || '',
      customerName: b.customerName,
      customerPhone: b.customerPhone || '',
      providerName: b.providerName,
      providerId: b.provider?._id?.toString() || '',
      customerId: b.customer?._id?.toString() || '',
      date: b.date,
      time: b.time,
      duration: b.duration,
      description: b.description || '',
      address: b.address?.street
        ? `${b.address.street}${b.address.city ? ', ' + b.address.city : ''}${b.address.pincode ? ' ' + b.address.pincode : ''}`
        : 'Address not provided',
      pricingType: b.pricingType || 'fixed',
      visitCharge: b.visitCharge,
      labourCharge: b.labourCharge,
      platformFee: b.platformFee,
      total: b.total,
      initialPayment: b.initialPayment || b.total,
      finalTotal: b.finalTotal || null,
      quote: b.quote || null,
      hourlyRate: b.hourlyRate || null,
      actualHours: b.actualHours || null,
      materialCharge: b.materialCharge || 0,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      status: b.status,
      isReviewed: b.isReviewed,
      createdAt: b.createdAt,
    }));

    res.json({ success: true, bookings: result });
  } catch (err) {
    console.error('[Get Bookings Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
});

// Get single booking by bookingId (e.g. HF1001)
app.get('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id })
      .populate('service', 'name category image basePrice')
      .populate('customer', 'name email phone')
      .populate('provider', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Ensure user can only see their own bookings (unless admin)
    if (req.user.role !== 'admin'
      && booking.customer._id.toString() !== req.user.id
      && booking.provider._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('[Get Single Booking Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch booking.' });
  }
});

// Create booking (customer) — pricing-model-aware
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    if (!['customer', 'provider'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only customers can create bookings.' });
    }
    const { serviceId, providerId, date, time, duration, paymentMethod,
      address, city, pincode, landmark, description,
      latitude, longitude, locality, state, formattedAddress } = req.body;

    if (!isObjectId(serviceId) || !date || !time) {
      return res.status(400).json({ success: false, message: 'Service, date and time are required.' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ success: false, message: 'A valid booking date is required.' });
    }
    if (!isValidTime(time)) {
      return res.status(400).json({ success: false, message: 'A valid booking time is required.' });
    }
    const bookingDuration = duration === undefined ? 1 : Number(duration);
    if (!Number.isFinite(bookingDuration) || bookingDuration <= 0 || bookingDuration > 24) {
      return res.status(400).json({ success: false, message: 'Duration must be between 1 and 24 hours.' });
    }
    const selectedPaymentMethod = paymentMethod || 'cash';
    if (!['cash', 'upi', 'card'].includes(selectedPaymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }
    const hasLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasLongitude = longitude !== undefined && longitude !== null && longitude !== '';
    if (hasLatitude !== hasLongitude || (hasLatitude && !isValidCoordinate(latitude, longitude))) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude must be provided together.' });
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) return res.status(404).json({ success: false, message: 'Service not found.' });
    await ensureServiceCategories();
    if (!await ServiceCategory.exists({ name: service.category, isActive: true })) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    const finalProviderId = providerId || (service.provider?._id || service.provider)?.toString();
    if (!isObjectId(finalProviderId) || service.provider.toString() !== finalProviderId) {
      return res.status(400).json({ success: false, message: 'The selected provider does not offer this service.' });
    }

    const customer = await User.findById(req.user.id).select('name phone');
    const provider = await User.findById(finalProviderId).select('name role providerStatus verificationStatus');
    if (!isApprovedProvider(provider)) return res.status(404).json({ success: false, message: 'Approved provider not found.' });

    // Compute pricing based on model
    let visitCharge = 0, labourCharge = 0, platformFee = 0, total = 0, initialPayment = 0;
    const pt = service.pricingType || 'fixed';

    if (pt === 'fixed') {
      labourCharge = Number(service.fixedPrice || service.basePrice || 0);
      platformFee = Math.round(labourCharge * 0.03);
      total = labourCharge + platformFee;
      initialPayment = total;
    } else if (pt === 'inspection') {
      visitCharge = Number(service.inspectionFee || service.basePrice || 0);
      platformFee = Math.round(visitCharge * 0.03);
      total = visitCharge + platformFee;
      initialPayment = total;
    } else if (pt === 'hourly') {
      visitCharge = Number(service.visitFee || service.basePrice || 0);
      const hrs = bookingDuration;
      labourCharge = Number(service.hourlyRate || 0) * hrs;
      platformFee = Math.round((visitCharge + labourCharge) * 0.03);
      total = visitCharge + labourCharge + platformFee;
      initialPayment = visitCharge + Math.round(visitCharge * 0.03);
    }

    // Double Booking Prevention Check
    const conflictingBooking = await Booking.findOne({
      provider: finalProviderId,
      date,
      time,
      status: { $in: ['pending', 'confirmed', 'upcoming', 'ongoing', 'quote_sent', 'quote_approved', 'completed'] }
    });

    if (conflictingBooking) {
      return res.status(409).json({ success: false, message: 'Provider is already booked for this exact date and time.' });
    }

    const booking = await Booking.create({
      service: serviceId,
      serviceName: service.name,
      serviceCategory: service.category,
      serviceImage: service.image || '',
      customer: req.user.id,
      customerName: customer?.name || 'Customer',
      customerPhone: publicPhone(customer?.phone),
      provider: finalProviderId,
      providerName: provider.name,
      date, time,
      duration: bookingDuration,
      description: description || '',
      address: {
        formattedAddress: formattedAddress || address || '',
        street: address || '',
        locality: locality || '',
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        landmark: landmark || '',
        latitude: hasLatitude ? Number(latitude) : undefined,
        longitude: hasLongitude ? Number(longitude) : undefined,
      },
      serviceLocation: hasLatitude ? {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      } : undefined,
      pricingType: pt,
      visitCharge, labourCharge, platformFee, total,
      initialPayment,
      hourlyRate: pt === 'hourly' ? (service.hourlyRate || 0) : undefined,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: 'pending',
      status: 'pending',
    });

    // Notify provider of new booking
    try {
      await Notification.create({
        userId: finalProviderId,
        title: 'New Booking Request',
        message: `New booking request for ${service.name} from ${customer?.name || 'Customer'}.`,
        type: 'NEW_BOOKING_REQUEST',
        link: '/provider/bookings',
      });
    } catch (notifErr) {
      console.error('[Booking Notification Error]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.bookingId, _id: booking._id.toString(),
        serviceName: booking.serviceName, providerName: booking.providerName,
        date: booking.date, time: booking.time,
        total: booking.total, initialPayment: booking.initialPayment,
        pricingType: booking.pricingType, status: booking.status,
      },
    });
  } catch (err) {
    console.error('[Create Booking Error]', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Provider is already booked for this exact date and time.' });
    }
    res.status(500).json({ success: false, message: err.message || 'Failed to create booking.' });
  }
});

// Update booking status helper
const handleBookingStatusUpdate = async (req, res) => {
  try {
    const { status, mode } = req.body;
    const validStatuses = ['pending', 'confirmed', 'upcoming', 'ongoing', 'quote_sent', 'quote_approved', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const booking = await Booking.findOne({ $or: [{ bookingId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }] });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    const ownsCustomerBooking = booking.customer.toString() === req.user.id;
    const ownsProviderBooking = booking.provider.toString() === req.user.id;
    const providerMode = mode === 'provider'
      || (mode !== 'customer' && req.user.role === 'provider' && !ownsCustomerBooking);
    if (req.user.role !== 'admin' && providerMode
      && (!ownsProviderBooking || req.user.providerStatus !== 'approved')) {
      return res.status(403).json({ success: false, message: 'Approved provider access to this booking is required.' });
    }
    if (req.user.role !== 'admin' && !providerMode && !ownsCustomerBooking) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const allowedTransitions = {
      customer: {
        pending: ['cancelled'],
        confirmed: ['cancelled'],
        upcoming: ['cancelled'],
      },
      provider: {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['ongoing'],
        ongoing: booking.pricingType === 'fixed' ? ['completed'] : [],
        quote_approved: ['completed'],
      },
    };
    const actorRole = providerMode ? 'provider' : 'customer';
    if (req.user.role !== 'admin'
      && !allowedTransitions[actorRole]?.[booking.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: 'This booking status transition is not allowed.' });
    }

    booking.status = status;
    await booking.save();

    // Send notification to customer on status update
    try {
      const recipientId = actorRole === 'provider' ? booking.customer : booking.provider;
      await Notification.create({
        userId: recipientId,
        title: `Booking ${status.toUpperCase()}`,
        message: `Booking #${booking.bookingId} (${booking.serviceName}) has been updated to ${status}.`,
        type: status === 'confirmed' ? 'SUCCESS' : status === 'cancelled' ? 'WARNING' : 'INFO',
        link: actorRole === 'provider' ? '/my-bookings' : '/provider/bookings',
      });
    } catch (notifErr) {
      console.error('[Status Notification Error]', notifErr.message);
    }

    res.json({ success: true, booking: { id: booking.bookingId, status: booking.status } });
  } catch (err) {
    console.error('[Update Booking Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update booking.' });
  }
};

app.put('/api/bookings/:id', requireAuth, handleBookingStatusUpdate);
app.put('/api/bookings/:id/status', requireAuth, handleBookingStatusUpdate);

// Provider submits a quote for inspection-type booking
app.post('/api/bookings/:id/quote', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.provider.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (booking.pricingType !== 'inspection') return res.status(400).json({ success: false, message: 'Quote is only for inspection-type bookings.' });
    if (booking.status !== 'ongoing') return res.status(400).json({ success: false, message: 'Start the booking before submitting a quote.' });

    const { labourCharge, partsCharge, additionalCharge, description } = req.body;
    const labour = Number(labourCharge);
    const parts = Number(partsCharge || 0);
    const additional = Number(additionalCharge || 0);
    if (!Number.isFinite(labour) || labour <= 0
      || !Number.isFinite(parts) || parts < 0
      || !Number.isFinite(additional) || additional < 0) {
      return res.status(400).json({ success: false, message: 'Enter a positive labour charge and non-negative additional charges.' });
    }

    const quoteTotal = labour + parts + additional;
    booking.quote = {
      labourCharge: labour, partsCharge: parts,
      additionalCharge: additional, description: description || '',
      total: quoteTotal, status: 'pending', createdAt: new Date(),
    };
    booking.status = 'quote_sent';
    await booking.save();
    res.json({ success: true, booking: { id: booking.bookingId, status: booking.status, quote: booking.quote } });
  } catch (err) {
    console.error('[Quote Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to submit quote.' });
  }
});

// Customer approves or rejects a quote
app.put('/api/bookings/:id/quote-response', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.customer.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (booking.status !== 'quote_sent') return res.status(400).json({ success: false, message: 'No pending quote.' });

    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject.' });
    }
    if (action === 'approve') {
      booking.quote.status = 'approved';
      booking.finalTotal = booking.initialPayment + booking.quote.total + Math.round(booking.quote.total * 0.03);
      booking.status = 'quote_approved';
    } else {
      booking.quote.status = 'rejected';
      booking.status = 'cancelled';
    }
    await booking.save();
    res.json({ success: true, booking: { id: booking.bookingId, status: booking.status, finalTotal: booking.finalTotal } });
  } catch (err) {
    console.error('[Quote Response Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to process quote response.' });
  }
});

// Provider completes hourly-type booking with actual hours
app.put('/api/bookings/:id/complete-hourly', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.provider.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (booking.pricingType !== 'hourly') return res.status(400).json({ success: false, message: 'Only for hourly bookings.' });

    const { actualHours, materialCharge } = req.body;
    const hours = Number(actualHours);
    const materials = Number(materialCharge || 0);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24
      || !Number.isFinite(materials) || materials < 0) {
      return res.status(400).json({ success: false, message: 'Enter valid hours and a non-negative materials charge.' });
    }

    booking.actualHours = hours;
    booking.materialCharge = materials;
    const labour = booking.hourlyRate * booking.actualHours;
    booking.finalTotal = booking.visitCharge + labour + booking.materialCharge + Math.round((booking.visitCharge + labour + booking.materialCharge) * 0.03);
    booking.status = 'completed';
    await booking.save();
    res.json({ success: true, booking: { id: booking.bookingId, status: booking.status, finalTotal: booking.finalTotal, actualHours: booking.actualHours } });
  } catch (err) {
    console.error('[Complete Hourly Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to complete hourly booking.' });
  }
});

// Get provider availability
app.get('/api/providers/:id/availability', async (req, res) => {
  try {
    const { date } = req.query; // e.g. YYYY-MM-DD
    if (!date) return res.status(400).json({ success: false, message: 'Date is required.' });

    const provider = await User.findById(req.params.id);
    if (!isApprovedProvider(provider)) {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    const avail = provider.availability || {};
    const workingHours = avail.workingHours || { start: '09:00', end: '18:00' };

    // Check if the date is in unavailableDates
    if (avail.unavailableDates && avail.unavailableDates.includes(date)) {
      return res.json({ success: true, availableSlots: [] });
    }

    // Convert date string to day of week (e.g., 'Mon')
    const dateObj = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = days[dateObj.getDay()];

    if (avail.workingDays && avail.workingDays.length > 0 && !avail.workingDays.includes(dayOfWeek)) {
      return res.json({ success: true, availableSlots: [] });
    }

    // Find all bookings for this provider on this date
    const existingBookings = await Booking.find({
      provider: provider._id,
      date,
      status: { $nin: ['cancelled', 'rejected'] }
    });

    const bookedTimes = existingBookings.map(b => b.time);

    // Generate slots (1-hour slots for simplicity)
    const availableSlots = [];
    let currentHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);

    while (currentHour < endHour) {
      const slotStr = `${currentHour.toString().padStart(2, '0')}:00`;

      // Check if inside a break
      let isBreak = false;
      if (avail.breaks) {
        for (const b of avail.breaks) {
          if (slotStr >= b.start && slotStr < b.end) {
            isBreak = true;
            break;
          }
        }
      }

      if (!isBreak && !bookedTimes.includes(slotStr)) {
        availableSlots.push(slotStr);
      }
      currentHour++;
    }

    res.json({ success: true, availableSlots });
  } catch (err) {
    console.error('[Provider Availability Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch availability.' });
  }
});

// Get Provider Earnings
app.get('/api/providers/me/earnings', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const bookings = await Booking.find({
      provider: req.user.id,
      paymentStatus: { $in: ['paid', 'partial'] }
    });

    let totalEarnings = 0;
    let platformFees = 0;
    const transactions = [];

    bookings.forEach(b => {
      const net = b.total - b.platformFee;
      totalEarnings += b.total;
      platformFees += b.platformFee;
      transactions.push({
        id: b.bookingId,
        bookingId: b.bookingId,
        amount: b.total,
        fee: b.platformFee,
        net: net,
        date: b.date,
        status: 'completed'
      });
    });

    const netEarnings = totalEarnings - platformFees;

    res.json({
      success: true,
      earnings: {
        totalEarnings,
        platformFees,
        netEarnings,
        availableBalance: netEarnings,
        weekly: [
          { week: 'W1', earnings: 0 },
          { week: 'W2', earnings: 0 },
          { week: 'W3', earnings: 0 },
          { week: 'W4', earnings: netEarnings }
        ],
        monthly: [
          { month: 'Jun', earnings: 0 },
          { month: 'Jul', earnings: 0 },
          { month: 'Aug', earnings: netEarnings }
        ],
        transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
        bankDetails: { accountNumber: '****1234', bankName: 'Mock Bank', ifsc: 'MOCK0001234' }
      }
    });
  } catch (err) {
    console.error('[Earnings Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch earnings' });
  }
});

// ---------- Custom Service Requests Routes ----------

// Haversine distance helper (returns distance in km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Create a Custom Service Request (Customer)
app.post('/api/custom-requests', requireAuth, async (req, res) => {
  try {
    if (!['customer', 'provider'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only customers can create custom service requests.' });
    }
    const { photos, budget } = req.body;
    const serviceTitle = (req.body.serviceTitle || req.body.title || req.body.category || 'Custom Service').trim();
    const description = (req.body.description || '').trim();
    const date = req.body.date || req.body.preferredDate;
    const time = req.body.time || '10:00';

    const rawLoc = req.body.location || req.body.address || {};
    const locAddress = typeof rawLoc === 'string' ? rawLoc : (rawLoc.address || rawLoc.formattedAddress || 'Haldwani, Uttarakhand');
    const locLatitude = rawLoc.latitude !== undefined ? Number(rawLoc.latitude) : 29.2183;
    const locLongitude = rawLoc.longitude !== undefined ? Number(rawLoc.longitude) : 79.5130;
    const locLocality = rawLoc.locality || '';
    const locCity = rawLoc.city || 'Haldwani';
    const locState = rawLoc.state || 'Uttarakhand';
    const locPincode = rawLoc.pincode || '263139';

    const location = {
      address: locAddress,
      latitude: locLatitude,
      longitude: locLongitude,
      locality: locLocality,
      city: locCity,
      state: locState,
      pincode: locPincode,
    };

    if (!description || description.length > 2000
      || !isValidCoordinate(location.latitude, location.longitude)
      || typeof location.address !== 'string' || !location.address.trim()
      || !isValidDate(date) || !isValidTime(time)) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (!Array.isArray(photos || []) || (photos || []).length > 5
      || (photos || []).some((photo) => typeof photo !== 'string' || photo.length > 2048)) {
      return res.status(400).json({ success: false, message: 'Up to five request photos are allowed.' });
    }
    if (budget !== undefined && budget !== null && (!Number.isFinite(Number(budget)) || Number(budget) < 0)) {
      return res.status(400).json({ success: false, message: 'Budget must be a non-negative number.' });
    }

    const request = await CustomServiceRequest.create({
      customerId: req.user.id,
      serviceTitle, description: description.trim(), photos,
      location: {
        type: 'Point',
        coordinates: [Number(location.longitude), Number(location.latitude)],
        address: location.address,
        locality: location.locality,
        city: location.city,
        state: location.state,
        pincode: location.pincode,
        houseOrFlat: location.houseOrFlat,
        landmark: location.landmark
      },
      date, time, budget: budget === undefined || budget === null ? undefined : Number(budget)
    });

    // Find eligible providers and notify them safely
    try {
      const providers = await User.find({
        $or: [
          { providerStatus: 'approved' },
          { role: 'provider', providerStatus: 'not_applied', verificationStatus: 'approved' },
        ],
        openToCustomRequests: true,
      });
      for (const provider of providers) {
        let isEligible = true;
        if (provider.location && provider.location.coordinates && provider.location.coordinates[0] !== 0) {
          const distKm = getDistanceFromLatLonInKm(
            location.latitude, location.longitude,
            provider.location.coordinates[1], provider.location.coordinates[0]
          );
          if (distKm > (provider.serviceRadius || 50)) {
            isEligible = false;
          }
        }
        if (isEligible) {
          await Notification.create({
            userId: provider._id,
            title: 'New Custom Request',
            message: `A new custom request "${serviceTitle || 'Custom Service'}" is available nearby.`,
            type: 'CUSTOM_REQUEST',
            link: '/provider/custom-requests'
          });
        }
      }
    } catch (notifErr) {
      console.error('[Notification Dispatch Warning]', notifErr.message);
    }

    res.status(201).json({ success: true, request });
  } catch (err) {
    console.error('[Create Custom Request Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to create request.' });
  }
});

// 2. Get Custom Requests
app.get('/api/custom-requests', requireAuth, async (req, res) => {
  try {
    let requests = [];
    if (req.user.role !== 'admin' && req.query.mode !== 'provider') {
      requests = await CustomServiceRequest.find({ customerId: req.user.id })
        .populate('acceptedProviders', 'name profileImage')
        .populate('selectedProviderId', 'name profileImage')
        .populate('quoteId')
        .sort({ createdAt: -1 });
    } else if (req.user.role !== 'admin') {
      const provider = await User.findById(req.user.id);
      if (!isApprovedProvider(provider)) {
        return res.status(403).json({ success: false, message: 'Provider approval is required to view requests.' });
      }

      // Fetch all pending requests not declined by this provider
      const pendingRaw = provider.openToCustomRequests
        ? await CustomServiceRequest.find({
          status: 'PENDING',
          declinedProviders: { $ne: req.user.id },
        }).populate('customerId', 'name').sort({ createdAt: -1 })
        : [];

      let filteredPending = pendingRaw;

      // If provider has location coordinates, filter by operating radius (default 50km if radius not specified)
      if (provider && provider.location && provider.location.coordinates && provider.location.coordinates[0] !== 0) {
        const provLng = provider.location.coordinates[0];
        const provLat = provider.location.coordinates[1];
        const maxDistKm = provider.serviceRadius || 50;

        filteredPending = pendingRaw.filter(r => {
          if (r.location && r.location.coordinates && r.location.coordinates[0] && r.location.coordinates[1]) {
            const dist = getDistanceFromLatLonInKm(provLat, provLng, r.location.coordinates[1], r.location.coordinates[0]);
            return dist <= maxDistKm;
          }
          return true; // Include if location format varies
        });
      }

      // Fetch requests where provider is accepted or selected
      const myAccepted = await CustomServiceRequest.find({
        $or: [
          { acceptedProviders: req.user.id },
          { selectedProviderId: req.user.id }
        ]
      }).populate('customerId', 'name').populate('quoteId').sort({ createdAt: -1 });

      requests = [...filteredPending, ...myAccepted];

      // Remove duplicates
      const uniqueIds = new Set();
      requests = requests.filter(r => {
        const idStr = r._id.toString();
        if (!uniqueIds.has(idStr)) {
          uniqueIds.add(idStr);
          return true;
        }
        return false;
      });

      requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({ success: true, requests });
  } catch (err) {
    console.error('[Get Custom Requests Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
});

// 3. Provider Accepts Request
app.post('/api/custom-requests/:id/accept', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const provider = await User.findById(req.user.id).select('role providerStatus verificationStatus openToCustomRequests');
    if (!isApprovedProvider(provider) || !provider.openToCustomRequests) {
      return res.status(403).json({ success: false, message: 'Enable custom requests on an approved provider account to accept requests.' });
    }
    const request = await CustomServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'PENDING' || request.declinedProviders.some((id) => id.toString() === req.user.id)) {
      return res.status(400).json({ success: false, message: 'Request not available.' });
    }

    if (!request.acceptedProviders.some((id) => id.toString() === req.user.id)) {
      request.acceptedProviders.push(req.user.id);
      await request.save();

      await Notification.create({
        userId: request.customerId,
        title: 'Provider Accepted Request',
        message: `A provider has accepted your custom request "${request.serviceTitle || 'Custom Service'}".`,
        type: 'SUCCESS'
      });
    }

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept request.' });
  }
});

// 4. Provider Declines Request
app.post('/api/custom-requests/:id/decline', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const request = await CustomServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request is no longer available.' });

    if (!request.declinedProviders.includes(req.user.id)) {
      request.declinedProviders.push(req.user.id);
      request.acceptedProviders = request.acceptedProviders.filter(id => id.toString() !== req.user.id);
      await request.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to decline request.' });
  }
});

// 5. Customer Selects Provider
app.post('/api/custom-requests/:id/select-provider', requireAuth, async (req, res) => {
  try {
    if (!['customer', 'provider'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only customers can select a provider.' });
    }
    const { providerId } = req.body;
    if (!isObjectId(providerId)) {
      return res.status(400).json({ success: false, message: 'A valid provider is required.' });
    }
    const request = await CustomServiceRequest.findOne({ _id: req.params.id, customerId: req.user.id });
    if (!request || request.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Invalid request.' });

    if (!request.acceptedProviders.some((id) => id.toString() === providerId)) {
      return res.status(400).json({ success: false, message: 'Provider has not accepted this request.' });
    }

    request.selectedProviderId = providerId;
    request.status = 'PROVIDER_SELECTED';
    await request.save();

    await Notification.create({
      userId: providerId,
      title: 'You were selected!',
      message: `Customer selected you for the request "${request.serviceTitle || 'Custom Service'}". Please send a quote.`,
      type: 'SUCCESS'
    });

    res.json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to select provider.' });
  }
});

// 6. Selected Provider Sends Quote
app.post('/api/custom-requests/:id/quote', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const request = await CustomServiceRequest.findOne({ _id: req.params.id, selectedProviderId: req.user.id });
    if (!request || request.status !== 'PROVIDER_SELECTED') return res.status(400).json({ success: false, message: 'Invalid request.' });

    let { inspectionFee = 0, labourFee = 0, materialFee = 0, additionalFee = 0, estimatedPrice } = req.body;
    if (estimatedPrice && !labourFee && !inspectionFee && !materialFee) {
      labourFee = Number(estimatedPrice);
    }
    const charges = [inspectionFee, labourFee, materialFee, additionalFee].map(Number);
    if (charges.some((charge) => !Number.isFinite(charge) || charge < 0)
      || charges.every((charge) => charge === 0)) {
      return res.status(400).json({ success: false, message: 'Quote charges must be non-negative and the total must be greater than zero.' });
    }
    const [inspection, labour, materials, additional] = charges;
    const totalAmount = inspection + labour + materials + additional;

    const quote = await Quote.create({
      requestId: request._id,
      providerId: req.user.id,
      inspectionFee: inspection,
      labourFee: labour,
      materialFee: materials,
      additionalFee: additional,
      totalAmount,
    });

    request.quoteId = quote._id;
    request.status = 'QUOTE_SENT';
    await request.save();

    await Notification.create({
      userId: request.customerId,
      title: 'Quote Received',
      message: `You received a quote of ₹${totalAmount} for your custom request.`,
      type: 'INFO'
    });

    res.json({ success: true, quote, request });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send quote.' });
  }
});

// 7. Customer Responds to Quote (Accept & Pay)
app.post('/api/custom-requests/:id/quote-response', requireAuth, async (req, res) => {
  try {
    if (!['customer', 'provider'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only customers can respond to a quote.' });
    }
    const { action, paymentMethod } = req.body; // action = 'accept' or 'reject'
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    }
    if (paymentMethod !== undefined && !['cash', 'upi', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }
    const request = await CustomServiceRequest.findOne({ _id: req.params.id, customerId: req.user.id }).populate('quoteId').populate('selectedProviderId');
    if (!request || request.status !== 'QUOTE_SENT' || !request.quoteId) {
      return res.status(400).json({ success: false, message: 'Invalid request.' });
    }

    const quote = request.quoteId;

    if (action === 'accept') {
      // Double Booking Prevention Check
      const conflictingBooking = await Booking.findOne({
        provider: request.selectedProviderId._id,
        date: request.date,
        time: request.time,
        status: { $nin: ['cancelled', 'rejected'] }
      });

      if (conflictingBooking) {
        return res.status(409).json({ success: false, message: 'Provider is already booked for this exact date and time. Please coordinate a new time.' });
      }

      const customer = await User.findById(req.user.id).select('name');

      // Create Booking
      const booking = await Booking.create({
        customRequestId: request._id,
        serviceName: request.serviceTitle || 'Custom Service',
        serviceCategory: 'Custom',
        customer: req.user.id,
        customerName: customer.name,
        provider: request.selectedProviderId._id,
        providerName: request.selectedProviderId.name,
        date: request.date,
        time: request.time,
        description: request.description,
        address: { street: request.location.address },
        pricingType: 'fixed',
        visitCharge: quote.inspectionFee,
        labourCharge: quote.labourFee + quote.materialFee + quote.additionalFee,
        platformFee: Math.round(quote.totalAmount * 0.03),
        total: quote.totalAmount + Math.round(quote.totalAmount * 0.03),
        initialPayment: quote.totalAmount + Math.round(quote.totalAmount * 0.03),
        paymentMethod: paymentMethod || 'cash',
        paymentStatus: 'pending',
        status: 'confirmed'
      });

      quote.status = 'ACCEPTED';
      await quote.save();
      request.status = 'QUOTE_ACCEPTED';
      request.bookingId = booking._id;
      await request.save();

      await Notification.create({
        userId: request.selectedProviderId._id,
        title: 'Quote Accepted & Booked!',
        message: `Customer accepted your quote for ₹${quote.totalAmount} and confirmed the booking.`,
        type: 'SUCCESS'
      });

      res.json({ success: true, booking, request });
    } else {
      quote.status = 'REJECTED';
      await quote.save();
      request.status = 'PROVIDER_SELECTED'; // Fallback to select another or re-quote
      request.quoteId = null;
      await request.save();
      res.json({ success: true, request });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to process quote response.' });
  }
});

// ---------- Notifications Routes ----------
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

app.put('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, userId: req.user.id }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

// Provider settings toggle endpoint
app.patch('/api/provider/settings', requireAuth, requireRole('provider'), async (req, res) => {
  try {
    const { openToCustomRequests, acceptingRequests, serviceRadius, coordinates, location, latitude, longitude } = req.body;
    const provider = await User.findById(req.user.id);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found.' });

    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      provider.location = {
        type: 'Point',
        coordinates: [Number(coordinates[0]), Number(coordinates[1])],
      };
    } else if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
      provider.location = {
        type: 'Point',
        coordinates: [Number(location.coordinates[0]), Number(location.coordinates[1])],
      };
    } else if (latitude !== undefined && longitude !== undefined) {
      provider.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
      if (provider.address) {
        provider.address.latitude = Number(latitude);
        provider.address.longitude = Number(longitude);
      }
    }

    const targetToggle = openToCustomRequests !== undefined ? openToCustomRequests : acceptingRequests;

    if (targetToggle !== undefined) {
      if (typeof targetToggle !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Provider request setting must be a boolean.' });
      }
      if (targetToggle && (!provider.location || !provider.location.coordinates || (provider.location.coordinates[0] === 0 && provider.location.coordinates[1] === 0))) {
        if (provider.address && provider.address.latitude && provider.address.longitude) {
          provider.location = {
            type: 'Point',
            coordinates: [Number(provider.address.longitude), Number(provider.address.latitude)],
          };
        } else if (!provider.city && (!provider.serviceAreas || provider.serviceAreas.length === 0) && (!provider.address || !provider.address.city)) {
          return res.status(400).json({ success: false, message: 'Please add your service location before receiving service requests.' });
        }
      }
      provider.openToCustomRequests = targetToggle;
    }

    if (serviceRadius !== undefined) {
      const radius = Number(serviceRadius);
      if (!Number.isFinite(radius) || radius < 1 || radius > 500) {
        return res.status(400).json({ success: false, message: 'Service radius must be between 1 and 500 km.' });
      }
      provider.serviceRadius = radius;
    }

    await provider.save();
    const safeUser = provider.toObject();
    delete safeUser.password;
    res.json({ success: true, message: 'Provider settings updated.', user: safeUser });
  } catch (err) {
    console.error('[Provider Settings Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update provider settings.' });
  }
});

// Profile update (protected)
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, email, phone, city, address, profileImage } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Name must not be empty.' });
      }
      user.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !/.+@.+\..+/.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid email address.' });
      }
      user.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return res.status(400).json({ success: false, message: 'Phone number must not be empty.' });
      }
      const updatedPhone = phone.trim();
      if (updatedPhone || !user.phone?.startsWith('email_')) {
        if (!updatedPhone) {
          return res.status(400).json({ success: false, message: 'Phone number must not be empty.' });
        }
        if (updatedPhone !== user.phone) user.phoneVerified = false;
        user.phone = updatedPhone;
      }
    }
    if (city !== undefined) {
      user.address = user.address || {};
      user.city = typeof city === 'string' ? city.trim() : user.city;
      user.address.city = user.city;
    }
    if (address !== undefined) {
      user.address = user.address || {};
      if (typeof address === 'string') {
        user.address.street = address.trim();
      } else if (address && typeof address === 'object' && !Array.isArray(address)) {
        for (const field of ['street', 'locality', 'city', 'state', 'country', 'pincode', 'landmark']) {
          if (typeof address[field] === 'string') user.address[field] = address[field].trim();
        }
      } else {
        return res.status(400).json({ success: false, message: 'Address must be text or an address object.' });
      }
    }
    if (profileImage !== undefined) {
      if (typeof profileImage !== 'string' || profileImage.length > 2048) {
        return res.status(400).json({ success: false, message: 'Invalid profile image URL.' });
      }
      user.profileImage = profileImage;
    }

    await user.save();
    res.json({ success: true, user: toPublicUser(user), message: 'Profile updated successfully' });
  } catch (err) {
    console.error('[Profile Update Error]', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email or phone number is already registered.' });
    }
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// Provider earnings (protected)
app.get('/api/earnings', requireAuth, requireRole('provider'), (req, res) => {
  // In a real implementation, compute earnings from bookings
  res.json({ success: true, earnings: { total: 0, recent: [] } });
});
// ---------- Admin Routes ----------

app.get('/api/admin/provider-applications', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const filter = req.query.status && ['draft', 'pending', 'approved', 'rejected'].includes(req.query.status)
      ? { status: req.query.status }
      : {};
    const applications = await ProviderApplication.find(filter)
      .populate('user', 'name email phone profileImage')
      .populate('reviewedBy', 'name email')
      .sort({ updatedAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    console.error('[Admin Provider Applications Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch provider applications.' });
  }
});

app.put('/api/admin/provider-applications/:id/review', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid application ID.' });
    }
    const rawStatus = req.body?.status || (req.body?.action === 'approve' ? 'approved' : req.body?.action === 'reject' ? 'rejected' : undefined);
    const status = rawStatus;
    const reason = req.body?.reason;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Choose approved or rejected.' });
    }
    if (status === 'rejected' && (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000)) {
      return res.status(400).json({ success: false, message: 'A rejection reason of up to 1000 characters is required.' });
    }
    const application = await ProviderApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Provider application not found.' });
    if (application.status !== 'pending') {
      return res.status(409).json({ success: false, message: 'Only pending applications can be reviewed.' });
    }
    const user = await User.findById(application.user);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'Applicant account not found.' });
    }
    application.status = status;
    application.rejectionReason = status === 'rejected' ? reason.trim() : undefined;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();
    user.providerStatus = status;
    user.providerRejectionReason = application.rejectionReason;
    if (status === 'approved') {
      user.role = 'provider';
      user.verificationStatus = 'approved';
      if (application.data) {
        if (application.data.radius) user.serviceRadius = Number(application.data.radius);
        if (application.data.city) user.city = application.data.city.trim();
        if (application.data.areas) user.serviceAreas = application.data.areas.split(',').map((a) => a.trim()).filter(Boolean);
        const appLat = application.data.latitude !== undefined && application.data.latitude !== '' ? Number(application.data.latitude) : user.address?.latitude;
        const appLng = application.data.longitude !== undefined && application.data.longitude !== '' ? Number(application.data.longitude) : user.address?.longitude;
        if (appLat !== undefined && appLng !== undefined && !isNaN(appLat) && !isNaN(appLng)) {
          const currentAddr = user.address?.toObject ? user.address.toObject() : (user.address || {});
          user.address = {
            ...currentAddr,
            latitude: appLat,
            longitude: appLng,
            city: application.data.city?.trim() || currentAddr.city,
            state: application.data.state?.trim() || currentAddr.state,
            pincode: application.data.pincode?.trim() || currentAddr.pincode,
          };
          user.location = {
            type: 'Point',
            coordinates: [appLng, appLat],
          };
        }
      }
    }
    await user.save();
    res.json({
      success: true,
      message: `Provider application ${status}.`,
      application,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('[Admin Provider Application Review Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to review provider application.' });
  }
});

// Admin: Get all providers
app.get('/api/admin/providers', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const providers = await User.find({
      $or: [{ role: 'provider' }, { providerStatus: 'approved' }]
    }).select('-password').sort({ createdAt: -1 });
    const formatted = providers.map(p => ({
      id: p._id.toString(),
      name: p.name,
      email: p.email,
      phone: p.phone,
      profession: p.profession || '',
      experience: p.experience || 0,
      city: p.address?.city || p.city || '',
      status: p.providerStatus !== 'not_applied' ? p.providerStatus : p.verificationStatus || 'pending',
      avatar: p.profileImage || '',
      joinDate: p.createdAt,
      about: p.about || '',
      skills: p.skills || [],
      services: p.skills || [],
    }));
    res.json({ success: true, providers: formatted });
  } catch (err) {
    console.error('[Admin Providers Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch providers.' });
  }
});

// Admin: Update provider verification status
app.put('/api/admin/providers/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved', 'rejected', 'pending', 'suspended'
    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'provider') {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }
    provider.verificationStatus = status;
    await provider.save();
    res.json({ success: true, message: `Provider ${status} successfully.`, provider: { id: provider._id, verificationStatus: provider.verificationStatus } });
  } catch (err) {
    console.error('[Admin Provider Status Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update provider status.' });
  }
});

// Admin: Get all users
app.get('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const bookingCounts = await Booking.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 } } },
    ]);
    const countsByUser = new Map(bookingCounts.map(({ _id, count }) => [_id.toString(), count]));
    res.json({
      success: true,
      users: users.map((user) => ({
        ...toPublicUser(user),
        bookings: countsByUser.get(user._id.toString()) || 0,
      })),
    });
  } catch (err) {
    console.error('[Admin Users Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

app.put('/api/admin/users/:id/status', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const targetStatus = body.status || body.accountStatus;
    if (!isObjectId(req.params.id) || !['active', 'suspended'].includes(targetStatus)) {
      return res.status(400).json({ success: false, message: 'A valid user and account status are required.' });
    }
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ success: false, message: 'Customer or provider account not found.' });
    }
    user.accountStatus = targetStatus;
    await user.save();
    res.json({ success: true, user: toPublicUser(user), message: `Account ${user.accountStatus}.` });
  } catch (err) {
    console.error('[Admin User Status Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update account status.' });
  }
});

// Admin: Platform stats
app.get('/api/admin/stats', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProviders = await User.countDocuments({
      $or: [{ providerStatus: { $in: ['pending', 'approved', 'rejected'] } }, { role: 'provider' }],
    });
    const pendingProviders = await User.countDocuments({
      $or: [
        { providerStatus: 'pending' },
        { role: 'provider', providerStatus: 'not_applied', verificationStatus: 'pending' },
      ],
    });
    const approvedProviders = await User.countDocuments({
      $or: [
        { providerStatus: 'approved' },
        { role: 'provider', providerStatus: 'not_applied', verificationStatus: 'approved' },
      ],
    });
    const totalServices = await Service.countDocuments();
    const totalBookings = await Booking.countDocuments();

    const completedBookings = await Booking.find({ status: 'completed' });
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total || b.finalAmount || 0), 0);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const recentRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = days[d.getDay()];
      const startOfDay = new Date(new Date(d).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(d).setHours(23, 59, 59, 999));
      const dayRev = completedBookings
        .filter(b => {
          const bDate = new Date(b.createdAt || b.date);
          return bDate >= startOfDay && bDate <= endOfDay;
        })
        .reduce((sum, b) => sum + (b.total || b.finalAmount || 0), 0);
      recentRevenue.push({ day: dayStr, revenue: dayRev });
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalProviders,
        pendingProviders,
        approvedProviders,
        totalServices,
        totalBookings,
        totalRevenue,
        monthlyGrowth: 12.5,
        revenueGrowth: 8.4,
        recentRevenue,
      },
    });
  } catch (err) {
    console.error('[Admin Stats Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// ---------- Reviews Route ----------
app.post('/api/reviews', requireAuth, requireRole('customer'), async (req, res) => {
  try {
    const { bookingId, providerId, rating, reviewText } = req.body;
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'A valid booking is required.' });
    }

    // Check if booking exists and belongs to customer (support both _id and bookingId string)
    const bookingQuery = isObjectId(bookingId)
      ? { $or: [{ _id: bookingId }, { bookingId: bookingId }], customer: req.user.id }
      : { bookingId: bookingId, customer: req.user.id };

    const booking = await Booking.findOne(bookingQuery);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.status !== 'completed') return res.status(400).json({ success: false, message: 'Can only review completed bookings.' });
    if (booking.isReviewed) return res.status(400).json({ success: false, message: 'Booking already reviewed.' });

    const finalProviderId = (providerId || booking.provider)?._id?.toString() || (providerId || booking.provider)?.toString();
    if (!isObjectId(finalProviderId) || booking.provider.toString() !== finalProviderId) {
      return res.status(400).json({ success: false, message: 'The review provider must match the booking provider.' });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Valid rating between 1 and 5 is required.' });
    }
    if (typeof reviewText !== 'string' || !reviewText.trim() || reviewText.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Review text is required and must be 2,000 characters or fewer.' });
    }

    const review = new Review({
      customerId: req.user.id,
      providerId: finalProviderId,
      bookingId: booking._id,
      rating: numericRating,
      reviewText: reviewText.trim()
    });
    await review.save();

    booking.isReviewed = true;
    await booking.save();

    if (booking.service) {
      const allReviews = await Review.find({ providerId: finalProviderId });
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);
      await Service.updateMany({ provider: finalProviderId }, {
        rating: Number(avg.toFixed(1)),
        reviewCount: allReviews.length
      });
    }

    res.json({ success: true, message: 'Review submitted successfully.', review });
  } catch (err) {
    console.error('[Submit Review Error]', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking.' });
    }
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err instanceof multer.MulterError
    ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
    : err.status || 500;
  if (status >= 500) console.error('[Unhandled Request Error]', err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
  });
});

const startServer = async () => {
  if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret_here' || JWT_SECRET.startsWith('replace_with_')) {
    throw new Error('JWT_SECRET must be set to a non-placeholder value before starting the backend.');
  }
  if (process.env.NODE_ENV === 'production' && JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  await connectDB();
  return app.listen(PORT, () => {
    console.log(`HomeFix Backend running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[Backend Startup Error]', err.message);
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
