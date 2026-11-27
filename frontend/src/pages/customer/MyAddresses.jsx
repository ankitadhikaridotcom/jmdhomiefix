import React, { useState, useEffect, useRef } from 'react';
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaHome,
  FaBriefcase,
  FaBookmark,
  FaSpinner,
  FaCrosshairs,
  FaSearch,
  FaTimes,
  FaMapMarkedAlt,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import LeafletMap from '../../components/common/LeafletMap';
import { detectCurrentLocation } from '../../utils/locationDetect';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editAddress, setEditAddress] = useState(null);

  // Form modal state for Add/Edit
  const [formData, setFormData] = useState({
    label: 'Home',
    customLabel: '',
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    latitude: 29.3803,
    longitude: 79.5126,
    isDefault: false,
  });

  // Location search and auto-detect states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/addresses`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load saved addresses.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditAddress(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setFormData({
      label: 'Home',
      customLabel: '',
      address: '',
      locality: '',
      city: '',
      state: '',
      pincode: '',
      latitude: 29.3803,
      longitude: 79.5126,
      isDefault: addresses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditAddress(addr);
    setSearchQuery(addr.address || `${addr.city || ''}, ${addr.state || ''}`);
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setFormData({
      label: addr.label || 'Home',
      customLabel: addr.customLabel || '',
      address: addr.address || '',
      locality: addr.locality || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      latitude: addr.latitude || 29.3803,
      longitude: addr.longitude || 79.5126,
      isDefault: addr.isDefault || false,
    });
    setIsModalOpen(true);
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`${API}/api/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Address deleted.');
        fetchAddresses();
      } else {
        toast.error(data.message || 'Failed to delete address.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete address.');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await fetch(`${API}/api/addresses/${id}/default`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Default address updated.');
        fetchAddresses();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to set default address.');
    }
  };

  // 1. Browser Geolocation GPS Handler (Auto-detect with IP fallback)
  const handleDetectGPS = async () => {
    setIsDetecting(true);
    const toastId = toast.loading('Detecting your location...');
    try {
      const data = await detectCurrentLocation(API);
      setFormData((prev) => ({
        ...prev,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        address: data.formattedAddress || prev.address,
        locality: data.locality || prev.locality,
        city: data.city || data.locality || prev.city,
        state: data.state || prev.state,
        pincode: data.pincode || prev.pincode,
      }));
      setSearchQuery(data.formattedAddress || `${data.city}, ${data.state}`);
      toast.success(
        data.approximate
          ? `Approximate location set (${data.city || 'network'}). Drag the map pin to adjust.`
          : `Location detected: ${data.city || data.locality || 'Coordinates updated'}`,
        { id: toastId }
      );
    } catch (error) {
      toast.error(error.message || 'Could not detect device location. Please search manually.', { id: toastId });
    } finally {
      setIsDetecting(false);
    }
  };

  // 2. Autosuggest search handler
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/location/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          const list = data.results || [];
          setSearchResults(list);
          setSearchDropdownOpen(list.length > 0);
        }
      } catch (err) {
        console.error('[Location Search Error]', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // 3. Select location from autosuggest list
  const handleSelectLocation = (item) => {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      address: item.formattedAddress || prev.address,
      locality: item.locality || prev.locality,
      city: item.city || item.locality || prev.city,
      state: item.state || prev.state,
      pincode: item.pincode || prev.pincode,
    }));
    setSearchQuery(item.formattedAddress || `${item.city}, ${item.state}`);
    setSearchResults([]);
    setSearchDropdownOpen(false);
    toast.success(`Selected: ${item.city || item.locality || 'Location'}`);
  };

  // 4. Map click or pin drag handler
  const handleMapPositionChange = async (lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitude: Number(lat),
      longitude: Number(lng),
    }));

    setIsReverseGeocoding(true);
    try {
      const res = await fetch(`${API}/api/location/reverse-geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          address: data.formattedAddress || prev.address,
          locality: data.locality || prev.locality,
          city: data.city || data.locality || prev.city,
          state: data.state || prev.state,
          pincode: data.pincode || prev.pincode,
        }));
        setSearchQuery(data.formattedAddress || `${data.city}, ${data.state}`);
        toast.success(`Location updated: ${data.city || data.locality || 'Pin placed'}`);
      }
    } catch (err) {
      console.error('[Map Reverse Geocode Error]', err);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!formData.address || !formData.latitude || !formData.longitude) {
      toast.error('Please select a valid address location.');
      return;
    }
    if (!formData.city) {
      toast.error('City is required.');
      return;
    }

    try {
      const url = editAddress
        ? `${API}/api/addresses/${editAddress._id}`
        : `${API}/api/addresses`;

      const method = editAddress ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editAddress ? 'Address updated!' : 'New address saved!');
        setIsModalOpen(false);
        fetchAddresses();
      } else {
        toast.error(data.message || 'Failed to save address.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving address.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span>📍 My Saved Addresses</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your service delivery locations for fast booking & provider discovery
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="btn-primary py-3 px-5 text-sm flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20"
        >
          <FaPlus className="w-4 h-4" />
          <span>Add New Address</span>
        </button>
      </div>

      {/* Address Cards Grid */}
      {loading ? (
        <div className="text-center py-16">
          <FaSpinner className="animate-spin w-8 h-8 text-primary-600 mx-auto" />
          <p className="text-sm text-gray-500 mt-2">Loading addresses...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            <FaMapMarkerAlt />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Saved Addresses</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Save your home, work, or custom locations for fast location-based booking.
          </p>
          <button onClick={handleOpenAddModal} className="btn-primary py-2.5 px-6 text-sm">
            Add Address Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 relative flex flex-col justify-between ${
                addr.isDefault
                  ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md'
                  : 'border-gray-100 hover:border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2.5 bg-primary-50 text-primary-600 rounded-xl text-lg">
                      {addr.label === 'Home' ? <FaHome /> : addr.label === 'Work' ? <FaBriefcase /> : <FaBookmark />}
                    </span>
                    <span className="font-bold text-gray-900 text-base">
                      {addr.label === 'Other' && addr.customLabel ? addr.customLabel : addr.label}
                    </span>
                  </div>

                  {addr.isDefault ? (
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full flex items-center space-x-1">
                      <FaCheckCircle className="w-3 h-3" />
                      <span>Default</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(addr._id)}
                      className="text-xs font-semibold text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-700 font-medium line-clamp-2 mb-2">{addr.address}</p>
                <div className="text-xs text-gray-400 space-y-0.5">
                  {addr.locality && <p>Locality: {addr.locality}</p>}
                  {addr.city && <p>{addr.city}, {addr.state} {addr.pincode}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEditModal(addr)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                  title="Edit Address"
                >
                  <FaEdit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteAddress(addr._id)}
                  className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  title="Delete Address"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Address Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaMapMarkerAlt className="text-emerald-300" />
                <h3 className="font-bold text-lg">{editAddress ? 'Edit Address' : 'Add New Address'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white p-1 text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Address Label Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Address Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setFormData({ ...formData, label: lbl })}
                      className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                        formData.label === lbl
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {lbl === 'Home' ? '🏠 Home' : lbl === 'Work' ? '🏢 Work' : '📍 Other'}
                    </button>
                  ))}
                </div>
                {formData.label === 'Other' && (
                  <input
                    type="text"
                    value={formData.customLabel}
                    onChange={(e) => setFormData({ ...formData, customLabel: e.target.value })}
                    className="input-field mt-2 text-xs"
                    placeholder="e.g. Parents' House, Studio, Shop"
                  />
                )}
              </div>

              {/* Automatic Location Section: GPS Auto-Detect & Autosuggest Search */}
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FaMapMarkerAlt className="text-emerald-700" /> Auto-Detect or Search Location
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click auto-detect or type to search. Your address and coordinates will auto-fill.
                    </p>
                  </div>

                  {/* Auto-detect button */}
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isDetecting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-900 disabled:opacity-60 transition shrink-0"
                  >
                    {isDetecting ? (
                      <>
                        <FaSpinner className="animate-spin text-xs" /> Detecting GPS...
                      </>
                    ) : (
                      <>
                        <FaCrosshairs className="text-xs" /> Auto-detect my location
                      </>
                    )}
                  </button>
                </div>

                {/* Location Autosuggest Search Bar */}
                <div className="relative" ref={searchContainerRef}>
                  <div className="relative flex items-center">
                    <FaSearch className="absolute left-3.5 text-slate-400 text-xs pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => searchResults.length > 0 && setSearchDropdownOpen(true)}
                      placeholder="Search area, locality, town, or address (autosuggest)..."
                      className="input-field pl-9 pr-9 text-xs h-10 bg-white shadow-sm"
                    />
                    {isSearching && (
                      <FaSpinner className="animate-spin absolute right-3.5 text-emerald-700 text-xs" />
                    )}
                    {!isSearching && searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setSearchDropdownOpen(false);
                        }}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    )}
                  </div>

                  {/* Autosuggest Dropdown */}
                  {searchDropdownOpen && searchResults.length > 0 && (
                    <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                      {searchResults.map((item, idx) => (
                        <li
                          key={idx}
                          onClick={() => handleSelectLocation(item)}
                          className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-emerald-50/80 cursor-pointer text-left border-b border-slate-100 last:border-b-0 transition"
                        >
                          <FaMapMarkerAlt className="text-emerald-700 text-xs mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-900 truncate">
                              {item.city || item.locality || item.formattedAddress?.split(',')[0]}
                              {item.state ? <span className="text-slate-500 font-normal">, {item.state}</span> : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {item.formattedAddress}
                            </div>
                          </div>
                          {item.pincode && (
                            <span className="shrink-0 text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.pincode}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Interactive Map */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-800">
                    <FaMapMarkedAlt className="text-emerald-700" /> Pinpoint Exact Delivery Location
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isReverseGeocoding ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <FaSpinner className="animate-spin" /> Fetching address...
                      </span>
                    ) : (
                      `📍 ${Number(formData.latitude || 29.3803).toFixed(4)}, ${Number(formData.longitude || 79.5126).toFixed(4)} · Drag pin or click map`
                    )}
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <LeafletMap
                    center={[Number(formData.latitude) || 29.3803, Number(formData.longitude) || 79.5126]}
                    markerPosition={[Number(formData.latitude) || 29.3803, Number(formData.longitude) || 79.5126]}
                    onPositionChange={handleMapPositionChange}
                    interactive={true}
                    height="220px"
                    circleColor="#047857"
                    circleFillColor="#10b981"
                  />
                </div>
              </div>

              {/* Form Input Details (Auto-filled, but fully editable) */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Street / House / Building Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-field text-xs resize-y"
                    placeholder="House/Flat number, building name, street..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Locality / Area
                    </label>
                    <input
                      type="text"
                      value={formData.locality}
                      onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. Mallital, Civil Lines"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. Haldwani, Nainital"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. Uttarakhand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">PIN Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="input-field text-xs"
                      placeholder="e.g. 263139"
                    />
                  </div>
                </div>
              </div>

              {/* Set as default checkbox */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefaultCheck"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-emerald-800 rounded border-gray-300 focus:ring-emerald-700"
                />
                <label htmlFor="isDefaultCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Set as default address for service bookings
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-6 text-xs shadow-md transition"
                >
                  {editAddress ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}