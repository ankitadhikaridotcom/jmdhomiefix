const express = require('express');
const router = express.Router();
const Address = require('../models/Address');
const { requireAuth } = require('../middleware/auth');
const isObjectId = (value) => /^[0-9a-f]{24}$/i.test(value);
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

// GET /api/addresses - Fetch all saved addresses for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, addresses });
  } catch (err) {
    console.error('[Get Addresses Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch saved addresses.' });
  }
});

// POST /api/addresses - Add a new saved address
router.post('/', requireAuth, async (req, res) => {
  try {
    const { label, customLabel, address, locality, city, state, country, pincode, latitude, longitude, isDefault } = req.body;

    if (typeof address !== 'string' || !address.trim() || !isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ success: false, message: 'Address and valid latitude/longitude are required.' });
    }
    if (label !== undefined && !['Home', 'Work', 'Other'].includes(label)) {
      return res.status(400).json({ success: false, message: 'Invalid address label.' });
    }
    if (isDefault !== undefined && typeof isDefault !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isDefault must be a boolean.' });
    }

    // If first address of user, make it default automatically
    const existingCount = await Address.countDocuments({ user: req.user.id });
    const shouldBeDefault = isDefault === true || existingCount === 0;

    const newAddress = await Address.create({
      user: req.user.id,
      label: label || 'Home',
      customLabel,
      address: address.trim(),
      locality: locality || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      pincode: pincode || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)], // [lng, lat]
      },
      isDefault: shouldBeDefault,
    });

    if (isDefault === true) {
      await Address.updateMany({ user: req.user.id, _id: { $ne: newAddress._id } }, { isDefault: false });
    }

    res.status(201).json({ success: true, address: newAddress });
  } catch (err) {
    console.error('[Create Address Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to save address.' });
  }
});

// PUT /api/addresses/:id - Update an address
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid address ID.' });
    }
    const { label, customLabel, address, locality, city, state, country, pincode, latitude, longitude, isDefault } = req.body;

    const targetAddress = await Address.findOne({ _id: req.params.id, user: req.user.id });
    if (!targetAddress) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized.' });
    }

    if (label !== undefined && !['Home', 'Work', 'Other'].includes(label)) {
      return res.status(400).json({ success: false, message: 'Invalid address label.' });
    }
    if (label !== undefined) targetAddress.label = label;
    if (customLabel !== undefined) targetAddress.customLabel = customLabel;
    if (address !== undefined) {
      if (typeof address !== 'string' || !address.trim()) {
        return res.status(400).json({ success: false, message: 'Address must not be empty.' });
      }
      targetAddress.address = address.trim();
    }
    if (locality !== undefined) targetAddress.locality = locality;
    if (city !== undefined) targetAddress.city = city;
    if (state !== undefined) targetAddress.state = state;
    if (country !== undefined) targetAddress.country = country;
    if (pincode !== undefined) targetAddress.pincode = pincode;
    if (isDefault !== undefined) {
      if (typeof isDefault !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isDefault must be a boolean.' });
      }
      targetAddress.isDefault = isDefault;
    }

    if (latitude !== undefined || longitude !== undefined) {
      if (!isValidCoordinate(latitude, longitude)) {
        return res.status(400).json({ success: false, message: 'Valid latitude and longitude must be provided together.' });
      }
      targetAddress.latitude = Number(latitude);
      targetAddress.longitude = Number(longitude);
      targetAddress.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)],
      };
    }

    await targetAddress.save();
    if (isDefault === true) {
      await Address.updateMany({ user: req.user.id, _id: { $ne: targetAddress._id } }, { isDefault: false });
    }
    res.json({ success: true, address: targetAddress });
  } catch (err) {
    console.error('[Update Address Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to update address.' });
  }
});

// DELETE /api/addresses/:id - Delete an address
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid address ID.' });
    }
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized.' });
    }

    // If deleted address was default, set the newest address as default
    if (address.isDefault) {
      const latest = await Address.findOne({ user: req.user.id }).sort({ createdAt: -1 });
      if (latest) {
        latest.isDefault = true;
        await latest.save();
      }
    }

    res.json({ success: true, message: 'Address deleted successfully.' });
  } catch (err) {
    console.error('[Delete Address Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete address.' });
  }
});

// PUT /api/addresses/:id/default - Set address as default
router.put('/:id/default', requireAuth, async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid address ID.' });
    }
    const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found or unauthorized.' });
    }

    address.isDefault = true;
    await address.save();
    await Address.updateMany({ user: req.user.id, _id: { $ne: address._id } }, { isDefault: false });

    res.json({ success: true, message: 'Default address updated.', address });
  } catch (err) {
    console.error('[Set Default Address Error]', err.message);
    res.status(500).json({ success: false, message: 'Failed to set default address.' });
  }
});

module.exports = router;
