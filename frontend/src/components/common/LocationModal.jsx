import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaCrosshairs, FaSearch, FaMapMarkedAlt, FaBookmark, FaTimes, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import LeafletMap from './LeafletMap';
import { useAuth } from '../../context/AuthContext';
import { detectCurrentLocation, reverseGeocodeCoordinates } from '../../utils/locationDetect';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LocationModal({ isOpen, onClose, onSelectLocation, initialLocation }) {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('gps'); // 'gps' | 'search' | 'map' | 'saved'
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsMethodNote, setGpsMethodNote] = useState('');

  // Address search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Selected location object state
  const [selectedLoc, setSelectedLoc] = useState({
    latitude: initialLocation?.latitude || user?.address?.latitude || 29.3803,
    longitude: initialLocation?.longitude || user?.address?.longitude || 79.5126,
    address: initialLocation?.address || initialLocation?.formattedAddress || user?.address?.formattedAddress || '',
    locality: initialLocation?.locality || user?.address?.locality || '',
    city: initialLocation?.city || user?.address?.city || '',
    state: initialLocation?.state || user?.address?.state || '',
    pincode: initialLocation?.pincode || user?.address?.pincode || '',
  });

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Sync selected location when modal opens or initialLocation/user loads
  useEffect(() => {
    if (!isOpen) return;
    setGpsError('');
    setGpsMethodNote('');

    const sourceAddr = initialLocation?.address || initialLocation?.formattedAddress || user?.address?.formattedAddress || '';
    const sourceLat = initialLocation?.latitude || user?.address?.latitude;
    const sourceLng = initialLocation?.longitude || user?.address?.longitude;

    if (sourceLat && sourceLng) {
      setSelectedLoc({
        latitude: sourceLat,
        longitude: sourceLng,
        address: sourceAddr,
        locality: initialLocation?.locality || user?.address?.locality || '',
        city: initialLocation?.city || user?.address?.city || '',
        state: initialLocation?.state || user?.address?.state || '',
        pincode: initialLocation?.pincode || user?.address?.pincode || '',
      });
    }

    if (user) {
      fetchSavedAddresses();
    }
  }, [isOpen, user, initialLocation]);

  const fetchSavedAddresses = async () => {
    if (!user) return;
    setLoadingSaved(true);
    try {
      const res = await fetch(`${API_BASE}/api/addresses`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSavedAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error('Failed to fetch addresses', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  // Reverse geocode coordinates with safe coordinate fallback
  const reverseGeocodeCoords = async (latitude, longitude) => {
    const loc = await reverseGeocodeCoordinates(API_BASE, latitude, longitude);
    setSelectedLoc({
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.formattedAddress,
      locality: loc.locality,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      pincode: loc.pincode,
    });
    setGpsMethodNote('Exact browser location detected. Click "Confirm & Set Location" below to apply.');
    toast.success(`Location detected: ${loc.city || loc.locality || 'Current Location'}`);
  };

  // 1. Browser Geolocation GPS Handler (no inaccurate ISP/IP override)
  const handleDetectGPS = async () => {
    setGpsError('');
    setGpsMethodNote('');
    setGpsLoading(true);
    try {
      const loc = await detectCurrentLocation(API_BASE);
      setSelectedLoc({
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.formattedAddress,
        locality: loc.locality,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        pincode: loc.pincode,
      });
      setGpsMethodNote('Exact browser location detected. Click "Confirm & Set Location" below to apply.');
      toast.success(`Location detected: ${loc.city || loc.locality || 'Current Location'}`);
    } catch (error) {
      setGpsError(error.message || 'Could not detect location. Please select your exact city/area via Search or Map below.');
      toast.error(error.message || 'Could not detect location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const runLocationSearch = async (query) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/api/location/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  // 2. Debounced Search Handler
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      runLocationSearch(query);
    }, 450);
  };

  const handleSelectSearchResult = (result) => {
    const newLoc = {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.formattedAddress,
      locality: result.locality,
      city: result.city,
      state: result.state,
      country: result.country,
      pincode: result.pincode,
    };
    setSelectedLoc(newLoc);
    toast.success(`Selected: ${result.city || result.locality || 'Location'}`);
  };

  // 3. Map Click Handler
  const handleMapPositionChange = async (lat, lng) => {
    setSelectedLoc((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: prev.address || `Pin (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`,
    }));

    try {
      const res = await fetch(`${API_BASE}/api/location/reverse-geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLoc({
          latitude: lat,
          longitude: lng,
          address: data.formattedAddress,
          locality: data.locality,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 4. Confirm Location & Persist to User DB + localStorage
  const handleConfirmLocation = async (locOverride = null) => {
    const locToSave = locOverride || selectedLoc;
    if (!locToSave.latitude || !locToSave.longitude) {
      toast.error('Please select a valid location.');
      return;
    }

    setLoading(true);
    try {
      try {
        localStorage.setItem('nivestry_user_location', JSON.stringify(locToSave));
      } catch {
        // ignore storage errors
      }

      // If user logged in, persist location to user profile
      if (user) {
        const res = await fetch(`${API_BASE}/api/location/current`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            latitude: locToSave.latitude,
            longitude: locToSave.longitude,
            formattedAddress: locToSave.address,
            locality: locToSave.locality,
            city: locToSave.city,
            state: locToSave.state,
            pincode: locToSave.pincode,
          }),
        });
        if (res.ok && refreshUser) {
          await refreshUser().catch(() => {});
        }
      }

      if (onSelectLocation) {
        onSelectLocation(locToSave);
      }

      toast.success('Location updated!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update location.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a18]/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#f7f5f0] border border-[#dedad0] rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1a1a18] text-[#f7f5f0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#b3261e]/20 text-[#b3261e] rounded-xl">
              <FaMapMarkerAlt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Select Location</h3>
              <p className="text-xs text-[#ebe8df]/70">Find nearby service providers in your area</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[#f7f5f0] transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#dedad0] bg-[#ebe8df] px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('gps')}
            className={`flex-1 py-3 px-3 text-xs font-semibold rounded-t-xl flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'gps'
                ? 'bg-[#f7f5f0] text-[#b3261e] border-t-2 border-[#b3261e] shadow-sm'
                : 'text-[#6a675f] hover:text-[#1a1a18]'
            }`}
          >
            <FaCrosshairs className="w-3.5 h-3.5" />
            <span>Current GPS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 px-3 text-xs font-semibold rounded-t-xl flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'search'
                ? 'bg-[#f7f5f0] text-[#b3261e] border-t-2 border-[#b3261e] shadow-sm'
                : 'text-[#6a675f] hover:text-[#1a1a18]'
            }`}
          >
            <FaSearch className="w-3.5 h-3.5" />
            <span>Search Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-3 text-xs font-semibold rounded-t-xl flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'map'
                ? 'bg-[#f7f5f0] text-[#b3261e] border-t-2 border-[#b3261e] shadow-sm'
                : 'text-[#6a675f] hover:text-[#1a1a18]'
            }`}
          >
            <FaMapMarkedAlt className="w-3.5 h-3.5" />
            <span>Choose on Map</span>
          </button>

          {user && (
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-3 px-3 text-xs font-semibold rounded-t-xl flex items-center justify-center space-x-2 transition-all ${
                activeTab === 'saved'
                  ? 'bg-[#f7f5f0] text-[#b3261e] border-t-2 border-[#b3261e] shadow-sm'
                  : 'text-[#6a675f] hover:text-[#1a1a18]'
              }`}
            >
              <FaBookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: GPS */}
          {activeTab === 'gps' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-[#ebe8df] rounded-full flex items-center justify-center mx-auto text-[#b3261e] text-2xl border border-[#dedad0]">
                <FaCrosshairs className={gpsLoading ? 'animate-spin' : ''} />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="font-bold text-[#1a1a18] text-base">Detect Current Location</h4>
                <p className="text-xs text-[#6a675f]">
                  Click the button below to detect your location via GPS or network.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="rounded-xl bg-[#b3261e] hover:bg-[#9c2019] disabled:opacity-60 text-white font-semibold py-3 px-6 text-sm flex items-center justify-center space-x-2 mx-auto shadow-md transition"
              >
                {gpsLoading ? (
                  <>
                    <FaSpinner className="animate-spin w-4 h-4" />
                    <span>Detecting Location...</span>
                  </>
                ) : (
                  <>
                    <FaCrosshairs className="w-4 h-4" />
                    <span>Use My Current Location</span>
                  </>
                )}
              </button>

              {gpsMethodNote && (
                <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 max-w-md mx-auto">
                  {gpsMethodNote}
                </p>
              )}

              {gpsError && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 max-w-md mx-auto">
                  <div className="flex items-start gap-2 text-xs text-amber-900 leading-relaxed">
                    <FaExclamationTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{gpsError}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('search');
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-semibold transition"
                    >
                      Search City / Area
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('map')}
                      className="px-3.5 py-2 rounded-lg bg-white border border-[#dedad0] text-[#1a1a18] text-xs font-semibold hover:bg-[#ebe8df] transition"
                    >
                      Choose on Map
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH */}
          {activeTab === 'search' && (
            <div className="space-y-3">
              <div className="relative">
                <FaSearch className="absolute left-3.5 top-3.5 text-[#6a675f] w-4 h-4" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type city, area or PIN code (e.g. Haldwani, Dehradun, Nainital)"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                      runLocationSearch(searchQuery);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#dedad0] rounded-xl text-sm text-[#1a1a18] placeholder:text-[#6a675f] focus:outline-none focus:ring-2 focus:ring-[#b3261e]/40 focus:border-[#b3261e]"
                />
                {searching && (
                  <FaSpinner className="animate-spin absolute right-3.5 top-3.5 text-[#b3261e] w-4 h-4" />
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSearchResult(item)}
                    className="p-3 bg-white hover:bg-[#ebe8df] border border-[#dedad0] hover:border-[#b3261e]/40 rounded-xl cursor-pointer transition-colors flex items-start space-x-3 group"
                  >
                    <FaMapMarkerAlt className="w-4 h-4 text-[#6a675f] group-hover:text-[#b3261e] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a18] line-clamp-1">{item.formattedAddress}</p>
                      <p className="text-[11px] text-[#6a675f]">
                        {[item.locality, item.city, item.state, item.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-center text-xs text-[#6a675f] py-4">No matching locations found.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LEAFLET MAP */}
          {activeTab === 'map' && (
            <div className="space-y-2">
              <p className="text-xs text-[#6a675f]">Click or drag the pin on the map to select exact location:</p>
              <LeafletMap
                center={[selectedLoc.latitude, selectedLoc.longitude]}
                zoom={14}
                markerPosition={[selectedLoc.latitude, selectedLoc.longitude]}
                onPositionChange={handleMapPositionChange}
                interactive={true}
                height="240px"
                circleColor="#b3261e"
                circleFillColor="#b3261e"
              />
            </div>
          )}

          {/* TAB 4: SAVED ADDRESSES */}
          {activeTab === 'saved' && (
            <div className="space-y-2">
              {loadingSaved ? (
                <div className="text-center py-6">
                  <FaSpinner className="animate-spin w-6 h-6 text-[#b3261e] mx-auto" />
                </div>
              ) : savedAddresses.length === 0 ? (
                <p className="text-center text-xs text-[#6a675f] py-6">No saved addresses yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => {
                        setSelectedLoc({
                          latitude: addr.latitude,
                          longitude: addr.longitude,
                          address: addr.address,
                          locality: addr.locality,
                          city: addr.city,
                          state: addr.state,
                          pincode: addr.pincode,
                        });
                        toast.success(`Selected saved address: ${addr.label}`);
                      }}
                      className="p-3 bg-white hover:bg-[#ebe8df] border border-[#dedad0] hover:border-[#b3261e]/40 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="p-2 bg-[#ebe8df] rounded-lg text-[#b3261e] font-bold text-xs">
                          {addr.label === 'Home' ? '🏠' : addr.label === 'Work' ? '🏢' : '📍'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-[#1a1a18]">{addr.label}</p>
                          <p className="text-[11px] text-[#6a675f] line-clamp-1">{addr.address}</p>
                        </div>
                      </div>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 bg-[#b3261e]/10 text-[#b3261e] text-[10px] font-bold rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Location Card */}
          {selectedLoc.address && (
            <div className="p-3.5 bg-[#ebe8df] border border-[#dedad0] rounded-2xl flex items-start space-x-3">
              <div className="p-2 bg-[#b3261e] text-white rounded-xl shrink-0 mt-0.5">
                <FaMapMarkerAlt className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[#b3261e]">Selected Location</span>
                <p className="text-xs font-bold text-[#1a1a18] truncate">{selectedLoc.address}</p>
                <p className="text-[11px] text-[#6a675f]">
                  {[selectedLoc.locality, selectedLoc.city, selectedLoc.state, selectedLoc.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#ebe8df] border-t border-[#dedad0] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#6a675f] hover:text-[#1a1a18]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleConfirmLocation()}
            disabled={loading || !selectedLoc.latitude || !selectedLoc.address}
            className="rounded-xl bg-[#b3261e] hover:bg-[#9c2019] disabled:opacity-50 text-white font-semibold py-2.5 px-6 text-xs flex items-center space-x-2 shadow-md transition"
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin w-3.5 h-3.5" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaCheck className="w-3.5 h-3.5" />
                <span>Confirm & Set Location</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
