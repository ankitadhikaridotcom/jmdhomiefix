import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  LayoutGrid,
  List,
  MapPin,
  Star,
  X,
  Save,
  AlertTriangle,
  Power,
  Briefcase,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ServiceFormFields,
  buildInitialServiceForm,
  validateServiceForm,
} from './ServiceFormFields';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatPricingSummary = (service) => {
  if (service.pricingType === 'fixed') {
    return { primary: `₹${service.fixedPrice ?? service.price}`, sub: 'Fixed price' };
  }
  if (service.pricingType === 'inspection') {
    return { primary: `₹${service.inspectionFee ?? service.price}`, sub: 'Visit / quote' };
  }
  if (service.pricingType === 'hourly') {
    return {
      primary: `₹${service.visitFee ?? service.price} + ₹${service.hourlyRate || 0}/hr`,
      sub: `${service.billingIncrement || 60}m billing`,
    };
  }
  return { primary: `₹${service.price}`, sub: 'Standard' };
};

const formatLocationSummary = (service) => {
  const parts = [
    service.address?.locality,
    service.address?.city,
    service.address?.pincode,
  ].filter(Boolean);
  return [...new Set(parts)].join(', ') || 'Base location not set';
};

const ServiceEditorModal = ({
  mode, // 'add' | 'edit' | 'duplicate'
  initialService,
  categories,
  user,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState(() => {
    if (mode === 'edit') return buildInitialServiceForm(user, initialService);
    if (mode === 'duplicate' && initialService) {
      const cloned = buildInitialServiceForm(user, initialService);
      return { ...cloned, name: `${cloned.name} (Copy)` };
    }
    return buildInitialServiceForm(user);
  });
  const [saving, setSaving] = useState(false);

  const isEdit = mode === 'edit';
  const modalTitle = isEdit
    ? 'Edit Service Listing'
    : mode === 'duplicate'
      ? 'Duplicate Service Listing'
      : 'Add New Service';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateServiceForm(form);
    if (errorMsg) return toast.error(errorMsg);

    setSaving(true);
    try {
      const url = isEdit
        ? `${API}/api/services/${initialService._id || initialService.id}`
        : `${API}/api/services`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to save service.');

      toast.success(isEdit ? 'Service updated!' : 'Service published to your catalog!');
      onSuccess(data.service, isEdit ? 'edit' : 'add');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a18]/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        className="bg-white rounded-3xl shadow-2xl border border-[#dedad0] w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="px-6 py-4 bg-[#1a1a18] text-[#f7f5f0] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">{modalTitle}</h2>
            <p className="text-xs text-[#ebe8df]/70 mt-0.5">
              Configure category, service kind, pricing, PIN code, address, and coverage radius.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-[#ebe8df] hover:bg-white/10 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 overflow-y-auto flex-1">
            <ServiceFormFields
              formData={form}
              setFormData={setForm}
              categories={categories}
              user={user}
              compact={true}
            />
          </div>

          <div className="px-6 py-4 bg-[#f7f5f0] border-t border-[#dedad0] flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#6a675f] hover:bg-[#ebe8df] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Service'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const DeleteConfirmModal = ({ service, deleting, onCancel, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a1a18]/60 backdrop-blur-sm p-4"
    onClick={(e) => e.target === e.currentTarget && !deleting && onCancel()}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white rounded-2xl border border-[#dedad0] shadow-2xl max-w-md w-full p-6"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#b3261e] border border-rose-200 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-extrabold text-[#1a1a18]">Delete Service?</h3>
      <p className="text-sm text-[#6a675f] mt-1.5 leading-relaxed">
        Are you sure you want to permanently delete{' '}
        <strong className="text-[#1a1a18]">{service.name}</strong>? Customers will no longer be able to view or book this offering.
      </p>
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-[#6a675f] hover:bg-[#ebe8df] transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-sm font-bold transition disabled:opacity-60"
        >
          <Trash2 className="w-4 h-4" />
          <span>{deleting ? 'Deleting...' : 'Delete Service'}</span>
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const ServiceManager = ({
  services = [],
  setServices,
  categories = [],
  user = null,
  loading = false,
  title = 'Service Offerings',
  subtitle = 'Create, edit, pause, duplicate, or remove the services you provide to customers.',
  defaultView = 'table',
  externalAddOpen = false,
  onExternalAddClose = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState(defaultView);
  const [editorState, setEditorState] = useState(null); // { mode: 'add'|'edit'|'duplicate', service }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeEditor = editorState || (externalAddOpen ? { mode: 'add', service: null } : null);

  const closeEditor = () => {
    setEditorState(null);
    if (externalAddOpen && onExternalAddClose) onExternalAddClose();
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return services.filter((s) => {
      const matchSearch = !q
        || s.name?.toLowerCase().includes(q)
        || s.category?.toLowerCase().includes(q)
        || s.serviceKind?.toLowerCase().includes(q)
        || s.address?.city?.toLowerCase().includes(q)
        || s.address?.pincode?.toLowerCase().includes(q);
      const matchCategory = filterCategory === 'all' || s.category === filterCategory;
      const matchStatus = filterStatus === 'all'
        || (filterStatus === 'active' ? s.isActive : !s.isActive);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [services, searchQuery, filterCategory, filterStatus]);

  const activeCount = services.filter((s) => s.isActive).length;
  const pausedCount = services.length - activeCount;

  const handleEditorSuccess = (savedService, action) => {
    if (!setServices) return;
    const savedId = savedService._id || savedService.id;
    if (action === 'edit') {
      setServices((prev) => prev.map((s) => ((s._id || s.id) === savedId ? savedService : s)));
    } else {
      setServices((prev) => [savedService, ...prev]);
    }
  };

  const handleToggle = async (service) => {
    const targetId = service._id || service.id;
    const original = service.isActive;
    setServices((prev) => prev.map((s) => ((s._id || s.id) === targetId ? { ...s, isActive: !original } : s)));
    try {
      const res = await fetch(`${API}/api/services/${targetId}/toggle`, {
        method: 'PUT',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to toggle service');
      if (data.service) {
        setServices((prev) => prev.map((s) => ((s._id || s.id) === targetId ? data.service : s)));
      }
      toast.success(data.isActive ? 'Service is now Active & visible to customers' : 'Service paused (hidden from catalog)');
    } catch (err) {
      setServices((prev) => prev.map((s) => ((s._id || s.id) === targetId ? { ...s, isActive: original } : s)));
      toast.error(err.message || 'Failed to update service status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget._id || deleteTarget.id;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/api/services/${targetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to delete service');
      setServices((prev) => prev.filter((s) => (s._id || s.id) !== targetId));
      toast.success('Service deleted from catalog');
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-[#dedad0] shadow-xs overflow-hidden">
      <AnimatePresence>
        {activeEditor && (
          <ServiceEditorModal
            mode={activeEditor.mode}
            initialService={activeEditor.service}
            categories={categories}
            user={user}
            onClose={closeEditor}
            onSuccess={handleEditorSuccess}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            service={deleteTarget}
            deleting={deleting}
            onCancel={() => !deleting && setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="p-5 sm:p-6 border-b border-[#ebe8df] bg-[#f7f5f0]/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1a1a18] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#b3261e]" />
              <span>{title}</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ebe8df] text-[#1a1a18] border border-[#dedad0]">
              {services.length} total
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {activeCount} active
            </span>
            {pausedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {pausedCount} paused
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#6a675f] mt-1">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/provider/add-service"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#dedad0] bg-white hover:bg-[#ebe8df] text-xs font-semibold text-[#1a1a18] transition"
          >
            <span>Full Add Page</span>
          </Link>
          <button
            type="button"
            onClick={() => setEditorState({ mode: 'add', service: null })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="p-4 sm:px-6 border-b border-[#ebe8df] flex flex-col md:flex-row md:items-center gap-3 bg-white">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6a675f] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by service name, kind, category, city, or PIN..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#dedad0] bg-[#f7f5f0]/50 text-sm text-[#1a1a18] placeholder:text-[#6a675f] focus:bg-white focus:border-[#b3261e] outline-none transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#dedad0] bg-white text-xs sm:text-sm font-semibold text-[#1a1a18] outline-none focus:border-[#b3261e]"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div className="inline-flex rounded-xl border border-[#dedad0] bg-[#f7f5f0] p-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Paused' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterStatus === tab.id
                    ? 'bg-[#1a1a18] text-white shadow-2xs'
                    : 'text-[#6a675f] hover:text-[#1a1a18]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl border border-[#dedad0] bg-[#f7f5f0] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white text-[#b3261e] shadow-2xs' : 'text-[#6a675f]'}`}
              title="Table view"
              aria-label="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white text-[#b3261e] shadow-2xs' : 'text-[#6a675f]'}`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-[#ebe8df]/60 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#ebe8df] text-[#b3261e] flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1a1a18]">
            {services.length === 0 ? 'No services published yet' : 'No matching services found'}
          </h3>
          <p className="text-xs text-[#6a675f] mt-1 max-w-sm mx-auto">
            {services.length === 0
              ? 'Publish your first service with pricing, service kind, PIN code, and coverage radius so customers can book you.'
              : 'Try adjusting your search query, category filter, or status filter.'}
          </p>
          {services.length === 0 && (
            <button
              type="button"
              onClick={() => setEditorState({ mode: 'add', service: null })}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] text-white text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Service</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f7f5f0] border-b border-[#ebe8df] text-[11px] font-bold uppercase tracking-wider text-[#6a675f]">
                <th className="py-3.5 px-5">Service</th>
                <th className="py-3.5 px-4">Category & Kind</th>
                <th className="py-3.5 px-4">Pricing</th>
                <th className="py-3.5 px-4">PIN & Coverage</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebe8df]">
              {filtered.map((service) => {
                const svcId = service._id || service.id;
                const priceInfo = formatPricingSummary(service);
                return (
                  <tr
                    key={svcId}
                    className={`hover:bg-[#f7f5f0]/60 transition ${!service.isActive ? 'opacity-65' : ''}`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                          src={service.image || '/deep-home-cleaning.jpg'}
                          alt={service.name}
                          onError={(e) => {
                            if (!e.currentTarget.dataset.fallbackApplied) {
                              e.currentTarget.dataset.fallbackApplied = '1';
                              e.currentTarget.src = '/deep-home-cleaning.jpg';
                            }
                          }}
                          className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[#dedad0] bg-[#ebe8df]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1a1a18] truncate max-w-[240px]">
                            {service.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#6a675f] mt-0.5">
                            {service.estimatedDuration && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {service.estimatedDuration}
                              </span>
                            )}
                            {service.rating > 0 && (
                              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {service.rating} ({service.reviewCount})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#ebe8df] text-[#1a1a18] text-xs font-bold">
                        {service.category}
                      </span>
                      {service.serviceKind && (
                        <p className="text-[11px] text-[#6a675f] mt-1">{service.serviceKind}</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="text-sm font-extrabold text-[#1a1a18] font-mono">{priceInfo.primary}</p>
                      <p className="text-[11px] text-[#6a675f]">{priceInfo.sub}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-xs text-[#1a1a18] font-medium max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 text-[#b3261e] shrink-0" />
                        <span className="truncate">{formatLocationSummary(service)}</span>
                      </div>
                      <p className="text-[11px] text-[#6a675f] mt-0.5">
                        Radius: {service.serviceRadius || 10} km
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggle(service)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition ${
                          service.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Toggle customer visibility"
                      >
                        <Power className="w-3 h-3" />
                        <span>{service.isActive ? 'Active' : 'Paused'}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditorState({ mode: 'edit', service })}
                          className="p-2 rounded-lg text-[#1a1a18] bg-[#ebe8df]/70 hover:bg-[#ebe8df] transition"
                          title="Edit service"
                          aria-label={`Edit ${service.name}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorState({ mode: 'duplicate', service })}
                          className="p-2 rounded-lg text-[#6a675f] hover:text-[#1a1a18] hover:bg-[#ebe8df]/70 transition"
                          title="Duplicate service"
                          aria-label={`Duplicate ${service.name}`}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {service.isActive && (
                          <Link
                            to={`/services/${svcId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg text-[#6a675f] hover:text-[#b3261e] hover:bg-[#ebe8df]/70 transition"
                            title="Preview customer listing"
                            aria-label={`Preview ${service.name}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(service)}
                          className="p-2 rounded-lg text-[#b3261e] hover:bg-rose-50 transition"
                          title="Delete service"
                          aria-label={`Delete ${service.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => {
            const svcId = service._id || service.id;
            const priceInfo = formatPricingSummary(service);
            return (
              <div
                key={svcId}
                className={`rounded-2xl border border-[#dedad0] bg-[#f7f5f0]/40 overflow-hidden flex flex-col transition hover:shadow-md ${
                  !service.isActive ? 'opacity-70' : ''
                }`}
              >
                <div className="relative h-36 bg-[#ebe8df]">
                  <img
                    src={service.image || '/deep-home-cleaning.jpg'}
                    alt={service.name}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallbackApplied) {
                        e.currentTarget.dataset.fallbackApplied = '1';
                        e.currentTarget.src = '/deep-home-cleaning.jpg';
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 bg-[#f7f5f0]/95 text-[#1a1a18] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#dedad0]">
                    {service.category}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(service)}
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs ${
                      service.isActive ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'
                    }`}
                  >
                    {service.isActive ? 'Active' : 'Paused'}
                  </button>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-[#1a1a18] text-sm line-clamp-1">{service.name}</h3>
                  {service.serviceKind && (
                    <span className="inline-block w-fit mt-1 text-[10px] font-semibold bg-white border border-[#dedad0] text-[#b3261e] px-2 py-0.5 rounded-md">
                      {service.serviceKind}
                    </span>
                  )}
                  <p className="text-xs text-[#6a675f] mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#b3261e] shrink-0" />
                    <span className="truncate">{formatLocationSummary(service)} · {service.serviceRadius || 10} km</span>
                  </p>
                  {service.description && (
                    <p className="text-xs text-[#6a675f] mt-1.5 line-clamp-2">{service.description}</p>
                  )}

                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-[#dedad0]">
                    <div>
                      <p className="text-sm font-extrabold text-[#1a1a18] font-mono">{priceInfo.primary}</p>
                      <p className="text-[10px] text-[#6a675f]">{priceInfo.sub}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditorState({ mode: 'edit', service })}
                        className="p-2 rounded-lg bg-white border border-[#dedad0] hover:bg-[#ebe8df] text-[#1a1a18] transition"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorState({ mode: 'duplicate', service })}
                        className="p-2 rounded-lg bg-white border border-[#dedad0] hover:bg-[#ebe8df] text-[#6a675f] transition"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {service.isActive && (
                        <Link
                          to={`/services/${svcId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-white border border-[#dedad0] hover:bg-[#ebe8df] text-[#b3261e] transition"
                          title="Preview live listing"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(service)}
                        className="p-2 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-[#b3261e] transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ServiceManager;
