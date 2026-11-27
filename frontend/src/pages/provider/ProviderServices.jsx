import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff,
  FaSearch, FaTimes, FaSave, FaStar, FaBriefcase, FaMapMarkerAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  ServiceFormFields,
  buildInitialServiceForm,
  validateServiceForm,
} from '../../components/provider/ServiceFormFields';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categoryIcons = {
  'Home Cleaning': '🧹', Plumber: '🚿', Electrician: '⚡', Painting: '🎨',
  Carpenter: '🪚', 'Appliance Repair': '🔧', 'AC Repair': '❄️', 'Pest Control': '🐛',
  'Salon at Home': '💇', Cleaning: '🧹', Plumbing: '🚿', Electrical: '⚡',
  Carpentry: '🪚', Appliances: '🔧', Other: '📦',
};

const pricingLabel = (service) => {
  if (service.pricingType === 'fixed') return `₹${service.fixedPrice} Fixed`;
  if (service.pricingType === 'inspection') return `From ₹${service.inspectionFee}`;
  if (service.pricingType === 'hourly') return `₹${service.visitFee} visit + ₹${service.hourlyRate}/hr`;
  return `₹${service.price}`;
};

const EditModal = ({ service, categories, user, onClose, onSave }) => {
  const [form, setForm] = useState(() => buildInitialServiceForm(user, service));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const errorMsg = validateServiceForm(form);
    if (errorMsg) return toast.error(errorMsg);
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/services/${service._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Service updated!');
        onSave(data.service);
        onClose();
      } else toast.error(data.message || 'Failed to update');
    } catch (e) {
      toast.error('Failed to update service');
    } finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Edit Service</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition"><FaTimes /></button>
        </div>
        <div className="p-6">
          <ServiceFormFields
            formData={form}
            setFormData={setForm}
            categories={categories}
            user={user}
            compact={true}
          />
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white z-10">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProviderServices = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/service-categories`)
      .then((response) => response.json())
      .then((data) => data.success && setCategories((data.categories || []).map((category) => category.name)))
      .catch((error) => toast.error(error.message || 'Failed to load service categories.'));
    const loadServices = async () => {
      try {
        const res = await fetch(`${API}/api/services/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) setServices(data.services || []);
      } catch (e) { toast.error('Failed to load services'); }
      finally { setLoading(false); }
    };
    loadServices();
  }, []);

  const handleToggle = async (service) => {
    const original = service.isActive;
    setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: !original } : s));
    try {
      const res = await fetch(`${API}/api/services/${service._id}/toggle`, { method: 'PUT', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: original } : s));
        toast.error('Failed to toggle service');
      } else {
        toast.success(data.isActive ? '🟢 Service is now Active' : '⭕ Service is now Inactive');
      }
    } catch (e) {
      setServices(prev => prev.map(s => s._id === service._id ? { ...s, isActive: original } : s));
    }
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`Delete "${service.name}"? This cannot be undone.`)) return;
    setServices(prev => prev.filter(s => s._id !== service._id));
    try {
      const res = await fetch(`${API}/api/services/${service._id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || 'Failed to delete');
        // Re-add
        const res2 = await fetch(`${API}/api/services/me`, { credentials: 'include' });
        const d2 = await res2.json();
        if (d2.success) setServices(d2.services);
      } else toast.success('Service deleted');
    } catch (e) {
      toast.error('Failed to delete service');
    }
  };

  const handleEditSave = (updated) => {
    setServices(prev => prev.map(s => s._id === updated._id ? updated : s));
  };

  const filtered = services.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = filterCategory === 'all' || s.category === filterCategory;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.isActive : !s.isActive);
    return matchSearch && matchCategory && matchStatus;
  });

  const activeCount = services.filter(s => s.isActive).length;
  const inactiveCount = services.filter(s => !s.isActive).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <AnimatePresence>
        {editingService && (
          <EditModal
            service={editingService}
            categories={categories}
            user={user}
            onClose={() => setEditingService(null)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3">
            <FaBriefcase className="text-primary-500" /> My Services
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your service listings — turn them ON/OFF, edit or delete.</p>
        </div>
        <Link to="/provider/add-service"
          className="btn-primary flex items-center gap-2 self-start sm:self-center">
          <FaPlus /> Add New Service
        </Link>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Services', value: services.length, color: 'text-gray-900', bg: 'bg-gray-50 border-gray-100' },
          { label: 'Active', value: activeCount, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Inactive', value: inactiveCount, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-100' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${s.bg} border rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search services..." className="input-field pl-9 text-sm" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field text-sm sm:w-44">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-sm sm:w-36">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Services Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service, i) => (
            <motion.div key={service._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow group ${!service.isActive ? 'opacity-70' : ''}`}>
              {/* Image */}
              <div className="relative h-40 overflow-hidden bg-gray-100">
                <img
                  src={service.image || '/deep-home-cleaning.jpg'}
                  alt={service.name}
                  onError={(e) => {
                    if (!e.currentTarget.dataset.fallbackApplied) {
                      e.currentTarget.dataset.fallbackApplied = '1';
                      e.currentTarget.src = '/deep-home-cleaning.jpg';
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Category Badge */}
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <span>{categoryIcons[service.category] || '📦'}</span> {service.category}
                </span>
                {/* Status Badge */}
                <span className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm ${service.isActive
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-400 text-white'}`}>
                  {service.isActive ? '🟢 Active' : '⭕ Inactive'}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-base leading-tight">{service.name}</h3>
                {service.serviceKind && (
                  <span className="inline-block mt-1 text-[10px] font-semibold bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
                    {service.serviceKind}
                  </span>
                )}
                {(service.address?.city || service.address?.pincode) && (
                  <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                    <FaMapMarkerAlt className="text-primary-500 shrink-0" />
                    <span className="truncate">
                      {[service.address?.locality, service.address?.city, service.address?.pincode].filter(Boolean).join(', ')}
                      {service.serviceRadius ? ` · ${service.serviceRadius} km` : ''}
                    </span>
                  </p>
                )}
                {service.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-sm font-black text-primary-600">{pricingLabel(service)}</span>
                  {service.rating > 0 && (
                    <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                      <FaStar className="text-amber-400" /> {service.rating} ({service.reviewCount})
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center gap-2">
                {/* ON/OFF Toggle */}
                <button onClick={() => handleToggle(service)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${service.isActive
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {service.isActive ? <><FaToggleOn className="text-base" /> Active</> : <><FaToggleOff className="text-base" /> Inactive</>}
                </button>
                {/* Edit */}
                <button onClick={() => setEditingService(service)}
                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition" title="Edit">
                  <FaEdit />
                </button>
                {/* Delete */}
                <button onClick={() => handleDelete(service)}
                  className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition" title="Delete">
                  <FaTrash />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <span className="text-6xl">🛠️</span>
          <h3 className="text-lg font-bold text-gray-700 mt-4">
            {searchQuery || filterCategory !== 'all' ? 'No services match your filters' : 'No services yet'}
          </h3>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
            {searchQuery || filterCategory !== 'all'
              ? 'Try clearing your search or changing filters.'
              : 'Add your first service to start receiving bookings from customers.'}
          </p>
          {!searchQuery && filterCategory === 'all' && (
            <Link to="/provider/add-service" className="btn-primary mt-6 inline-flex items-center gap-2">
              <FaPlus /> Add Your First Service
            </Link>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ProviderServices;
