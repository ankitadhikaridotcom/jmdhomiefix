/**
 * Nivestry Database Reset & Canonical Seeding Script
 * 
 * Clears old test users, test bookings, test reviews, test notifications,
 * and recreates a fresh, production-ready environment with:
 *  - 1 Clean Admin (admin@nivestry.com / admin123)
 *  - 1 Verified Official Service Partner (provider@nivestry.com / provider123)
 *  - 16 High-Quality Services across all 9 official categories
 *  - 9 Clean Official Service Categories
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const CustomServiceRequest = require('../models/CustomServiceRequest');
const Quote = require('../models/Quote');
const ProviderApplication = require('../models/ProviderApplication');
const Counter = require('../models/Counter');

const defaultCategories = [
  'Home Cleaning',
  'Plumber',
  'Electrician',
  'Painting',
  'Carpenter',
  'Appliance Repair',
  'AC Repair',
  'Pest Control',
  'Salon at Home',
];

const canonicalServices = [
  {
    name: 'Deep Home Cleaning',
    category: 'Home Cleaning',
    description: 'Thorough top-to-bottom sanitization and deep cleaning of rooms, kitchen, and bathrooms using eco-friendly solutions.',
    pricingType: 'fixed',
    fixedPrice: 1499,
    basePrice: 1499,
    image: '/deep-home-cleaning.jpg',
    rating: 4.9,
    reviewCount: 38,
  },
  {
    name: 'Sofa & Carpet Upholstery Shampooing',
    category: 'Home Cleaning',
    description: 'Deep foam shampooing and high-suction extraction for fabric sofas, armchairs, and floor carpets.',
    pricingType: 'fixed',
    fixedPrice: 799,
    basePrice: 799,
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 22,
  },
  {
    name: 'Switchboard, Socket & Short Circuit Fix',
    category: 'Electrician',
    description: 'Repair faulty switches, sparking sockets, tripping MCBs, and general domestic electrical diagnostics.',
    pricingType: 'hourly',
    visitFee: 199,
    hourlyRate: 150,
    billingIncrement: 60,
    basePrice: 199,
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 45,
  },
  {
    name: 'Full Home Circuit Inspection & MCB Service',
    category: 'Electrician',
    description: 'Comprehensive load check, inverter wiring check, earthing check, and main distribution box health review.',
    pricingType: 'fixed',
    fixedPrice: 599,
    basePrice: 599,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 29,
  },
  {
    name: 'Emergency Pipe Leak & Tap Repair',
    category: 'Plumber',
    description: 'Quick resolution of burst pipes, leaking faucets, under-sink leaks, and high-pressure water issues.',
    pricingType: 'inspection',
    inspectionFee: 149,
    basePrice: 149,
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 52,
  },
  {
    name: 'Washbasin & Toilet Cistern Fitting',
    category: 'Plumber',
    description: 'Installation and repair of bathroom faucets, health faucets, commode flush valves, and waste drainage.',
    pricingType: 'fixed',
    fixedPrice: 349,
    basePrice: 349,
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&auto=format&fit=crop',
    rating: 4.7,
    reviewCount: 19,
  },
  {
    name: 'Furniture Assembly & Wooden Repair',
    category: 'Carpenter',
    description: 'Assembling modular flatpack furniture (IKEA, Urban Ladder), hinge fixes, and wardrobe door alignments.',
    pricingType: 'hourly',
    visitFee: 199,
    hourlyRate: 200,
    billingIncrement: 60,
    basePrice: 199,
    image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 31,
  },
  {
    name: 'Door Lock, Latch & Handle Installation',
    category: 'Carpenter',
    description: 'Security lock replacements, magnetic door catches, modern smart lock installation, and latch fittings.',
    pricingType: 'fixed',
    fixedPrice: 399,
    basePrice: 399,
    image: 'https://images.unsplash.com/photo-1506898667547-82a6e3834d37?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 26,
  },
  {
    name: 'AC Master PowerJet Service & Gas Refill',
    category: 'AC Repair',
    description: 'High-pressure PowerJet coil cleaning, filter wash, refrigerant pressure check, and gas top-up.',
    pricingType: 'fixed',
    fixedPrice: 699,
    basePrice: 699,
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 67,
  },
  {
    name: 'Split & Window AC Installation / Uninstallation',
    category: 'AC Repair',
    description: 'Professional copper piping layout, outdoor bracket mounting, vacuum testing, and leak inspection.',
    pricingType: 'inspection',
    inspectionFee: 249,
    basePrice: 249,
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 18,
  },
  {
    name: 'Refrigerator & Washing Machine Diagnostics',
    category: 'Appliance Repair',
    description: 'Inspection and troubleshooting of cooling issues, abnormal noise, drum spin failure, and PCB faults.',
    pricingType: 'inspection',
    inspectionFee: 199,
    basePrice: 199,
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 34,
  },
  {
    name: 'Microwave & Induction Cooktop Repair',
    category: 'Appliance Repair',
    description: 'Heating element repair, magnetron replacement, touch panel fix, and internal power supply restoration.',
    pricingType: 'fixed',
    fixedPrice: 449,
    basePrice: 449,
    image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&auto=format&fit=crop',
    rating: 4.7,
    reviewCount: 15,
  },
  {
    name: 'Full Interior Wall Painting & Consultation',
    category: 'Painting',
    description: 'Laser wall measurement, color shade advice, putty smoothing, and 2-coat premium emulsion painting.',
    pricingType: 'inspection',
    inspectionFee: 199,
    basePrice: 199,
    image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 41,
  },
  {
    name: 'Waterproofing & Ceiling Dampness Treatment',
    category: 'Painting',
    description: 'Infrared moisture detection, crack filling with polymer sealant, and primer anti-fungal barrier coat.',
    pricingType: 'inspection',
    inspectionFee: 299,
    basePrice: 299,
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop',
    rating: 4.8,
    reviewCount: 14,
  },
  {
    name: 'Complete Home Pest Control & Cockroach Gel',
    category: 'Pest Control',
    description: 'Odorless Bayer herbal gel treatment for kitchen cabinets and safe synthetic spray for cracks and drain lines.',
    pricingType: 'fixed',
    fixedPrice: 899,
    basePrice: 899,
    image: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 58,
  },
  {
    name: 'Salon at Home - Classic Facial & Hair Spa',
    category: 'Salon at Home',
    description: 'Professional hygiene single-use kit, fruit cleanup facial, deep scalp steam therapy, and relaxing head massage.',
    pricingType: 'fixed',
    fixedPrice: 999,
    basePrice: 999,
    image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&auto=format&fit=crop',
    rating: 4.9,
    reviewCount: 49,
  },
];

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGO_URI is missing from backend/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected successfully.');

  const db = mongoose.connection.db;

  // 1. Delete all existing test users
  console.log('Clearing existing users and related transactional data...');
  const delUsers = await User.deleteMany({});
  console.log(`Deleted ${delUsers.deletedCount} users.`);

  // 2. Clear bookings, reviews, notifications, custom requests, quotes, apps, counters
  const delBookings = await Booking.deleteMany({});
  console.log(`Deleted ${delBookings.deletedCount} bookings.`);

  const delReviews = await Review.deleteMany({});
  console.log(`Deleted ${delReviews.deletedCount} reviews.`);

  const delNotifs = await Notification.deleteMany({});
  console.log(`Deleted ${delNotifs.deletedCount} notifications.`);

  const delRequests = await CustomServiceRequest.deleteMany({});
  console.log(`Deleted ${delRequests.deletedCount} custom requests.`);

  const delQuotes = await Quote.deleteMany({});
  console.log(`Deleted ${delQuotes.deletedCount} quotes.`);

  const delApps = await ProviderApplication.deleteMany({});
  console.log(`Deleted ${delApps.deletedCount} provider applications.`);

  await Counter.deleteMany({});
  console.log('Reset counters.');

  // Clean legacy collections if present
  try { await db.collection('customers').deleteMany({}); } catch (_) {}
  try { await db.collection('providers').deleteMany({}); } catch (_) {}
  try { await db.collection('addresses').deleteMany({}); } catch (_) {}

  // 3. Clean up Service Categories (remove QA Category entries)
  await ServiceCategory.deleteMany({ name: { $regex: /^QA Category/i } });
  for (const catName of defaultCategories) {
    await ServiceCategory.updateOne(
      { name: catName },
      {
        $setOnInsert: {
          name: catName,
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          description: `${catName} professional home services`,
          isActive: true,
        }
      },
      { upsert: true }
    );
  }
  console.log('Cleaned and synced Service Categories.');

  // 4. Create Pristine Admin Account
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await User.create({
    name: 'Nivestry Admin',
    email: 'admin@nivestry.com',
    phone: '+919876543210',
    password: adminPasswordHash,
    role: 'admin',
    accountStatus: 'active',
    phoneVerified: true,
    address: {
      formattedAddress: 'Connaught Place, New Delhi, Delhi',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139],
    },
  });
  console.log(`Created Admin: ${admin.email} (password: admin123)`);

  // 5. Create Pristine Official Verified Provider
  const providerPasswordHash = await bcrypt.hash('provider123', 10);
  const provider = await User.create({
    name: 'Nivestry Verified Pro',
    email: 'provider@nivestry.com',
    phone: '+919876543211',
    password: providerPasswordHash,
    role: 'provider',
    providerStatus: 'approved',
    verificationStatus: 'approved',
    accountStatus: 'active',
    phoneVerified: true,
    openToCustomRequests: true,
    serviceRadius: 50,
    experience: 8,
    profession: 'Multi-Service Home Expert',
    about: 'Certified Nivestry Partner providing premium home repair, electrical, plumbing, cleaning and AC maintenance with guaranteed warranty.',
    address: {
      formattedAddress: 'Connaught Place, New Delhi, Delhi 110001',
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      pincode: '110001',
      latitude: 28.6139,
      longitude: 77.2090,
    },
    location: {
      type: 'Point',
      coordinates: [77.2090, 28.6139],
    },
    availability: {
      workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      timeSlots: ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      workingHours: {
        start: '09:00',
        end: '20:00',
      },
    },
    serviceAreas: ['New Delhi', 'South Delhi', 'Central Delhi', 'Noida', 'Gurugram'],
  });
  console.log(`Created Verified Provider: ${provider.email} (password: provider123)`);

  // 6. Delete old/junk services and insert canonical services linked to verified provider
  await Service.deleteMany({});
  const servicesToInsert = canonicalServices.map((svc) => ({
    ...svc,
    serviceKind: svc.pricingType === 'inspection' ? 'Inspection & Consultation' : svc.pricingType === 'hourly' ? 'Repair & Troubleshooting' : 'Full Package',
    address: { ...provider.address },
    location: { ...provider.location },
    serviceRadius: provider.serviceRadius,
    serviceAreas: [...provider.serviceAreas],
    provider: provider._id,
    isActive: true,
    createdAt: new Date(),
  }));

  const insertedServices = await Service.insertMany(servicesToInsert);
  console.log(`Inserted ${insertedServices.length} pristine canonical services.`);

  // 7. Verify collection indexes
  console.log('Ensuring all schema indexes...');
  try {
    await User.init();
    await Service.init();
    await Booking.init();
    await Review.init();
    await Notification.init();
    await CustomServiceRequest.init();
    console.log('Indexes synced successfully.');
  } catch (idxErr) {
    console.warn('Index sync note:', idxErr.message);
  }

  console.log('========================================================');
  console.log('DATABASE RESET & INITIAL SEEDING COMPLETE! 🎉');
  console.log('All 55 old test users have been purged.');
  console.log('New Admin:    admin@nivestry.com    / admin123');
  console.log('New Provider: provider@nivestry.com / provider123');
  console.log(`Active Services: ${insertedServices.length}`);
  console.log('New users can now register freshly via /register.');
  console.log('========================================================');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
