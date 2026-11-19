import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt, FaCamera, FaEdit, FaSave, FaCrosshairs, FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomerProfile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
    },
  });

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetecting(true);
    const toastId = toast.loading('Detecting your GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${API}/api/location/reverse-geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });
          const data = await res.json();

          if (data.success) {
            setValue('address', data.formattedAddress || `${data.locality || ''}, ${data.city || ''}`);
            setValue('city', data.city || data.locality || '');
            toast.success(`Location detected: ${data.city || data.locality || 'Coordinates updated'}`, { id: toastId });
          } else {
            toast.error('Could not determine address from location.', { id: toastId });
          }
        } catch {
          toast.error('Failed to resolve GPS coordinates.', { id: toastId });
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission was denied. Please allow location access in your browser.', { id: toastId });
        } else {
          toast.error('Could not detect device location. Please enter manually.', { id: toastId });
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const onSubmit = async (data) => {
    try {
      await updateUser(data);
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to update profile.');
    }
  };

  const handleCancel = () => {
    reset();
    setEditing(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const uploadRes = await fetch(`${API}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) throw new Error(uploadData.message || 'Failed to upload image');

      await updateUser({ profileImage: uploadData.photoUrl });
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your account settings</p>
        </motion.div>

        {user?.role !== 'admin' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="mt-4 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-emerald-950">{user?.providerStatus === 'approved' ? 'Provider account approved' : 'Earn with your skills'}</h3>
              <p className="mt-1 text-sm text-emerald-800">
                {user?.providerStatus === 'pending'
                  ? 'Your application is being reviewed.'
                  : user?.providerStatus === 'approved'
                    ? 'Switch to your provider dashboard whenever you’re ready.'
                    : 'Apply to offer services without losing access to customer bookings.'}
              </p>
            </div>
            <Link to={user?.providerStatus === 'approved' ? '/provider' : '/provider-application'}
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">
              {user?.providerStatus === 'approved' ? 'Provider dashboard' : user?.providerStatus === 'pending' ? 'Track application' : 'Become a Service Provider'}
            </Link>
          </motion.div>
        )}

        {/* Saved Addresses Banner */}
        {user?.role === 'customer' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
            className="mt-4 flex flex-col gap-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 text-lg shadow-sm">
                <FaMapMarkerAlt />
              </div>
              <div>
                <h3 className="font-bold text-teal-950">Saved Delivery Addresses</h3>
                <p className="mt-0.5 text-xs text-teal-800">
                  Save your home, work, and family addresses with map pin & GPS auto-detection.
                </p>
              </div>
            </div>
            <Link to="/my-addresses"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-teal-800 px-4 py-2 text-xs font-bold text-white hover:bg-teal-900 shadow-sm transition">
              Manage Addresses →
            </Link>
          </motion.div>
        )}

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 mt-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group">
              <img
                src={user?.profileImage || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}
                alt={user?.name}
                className={`w-24 h-24 rounded-2xl object-cover ring-4 ring-primary-100 ${uploadingImage ? 'opacity-50' : ''}`}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100
                             transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed">
                <FaCamera className="text-white text-lg" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className="badge-primary mt-2 capitalize">{user?.role}</span>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="sm:ml-auto btn-ghost flex items-center gap-2"
            >
              <FaEdit className="text-sm" /> {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6 mt-4">
          <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input {...register('name')} disabled={!editing} className="input-field pl-11 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input {...register('email')} disabled={!editing} className="input-field pl-11 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone</label>
                <div className="relative">
                  <FaPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input {...register('phone')} disabled={!editing} className="input-field pl-11 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">City</label>
                <div className="relative">
                  <FaMapMarkerAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input {...register('city')} disabled={!editing} className="input-field pl-11 disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Address</label>
                {editing && (
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isDetecting}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition disabled:opacity-60"
                  >
                    {isDetecting ? (
                      <>
                        <FaSpinner className="animate-spin text-[10px]" /> Detecting GPS...
                      </>
                    ) : (
                      <>
                        <FaCrosshairs className="text-[10px]" /> Auto-detect location
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea {...register('address')} disabled={!editing} rows={2} className="input-field disabled:bg-gray-50 disabled:text-gray-500 resize-none" />
            </div>

            {editing && (
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={handleCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2">
                  <FaSave className="text-sm" /> Save Changes
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerProfile;
