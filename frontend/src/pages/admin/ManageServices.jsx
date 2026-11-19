import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaCheck, FaEdit, FaPlus, FaTimes } from 'react-icons/fa';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ManageServices = () => {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/service-categories`, { withCredentials: true });
      setCategories(data.categories || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load service categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const resetForm = () => {
    setName('');
    setEditing(null);
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    if (!name.trim()) return toast.error('Enter a category name.');
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/api/admin/service-categories/${editing._id}`, { name: name.trim() }, { withCredentials: true });
        toast.success('Category updated.');
      } else {
        await axios.post(`${API}/api/admin/service-categories`, { name: name.trim() }, { withCredentials: true });
        toast.success('Category added.');
      }
      resetForm();
      await loadCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save this category.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (category) => {
    try {
      await axios.put(`${API}/api/admin/service-categories/${category._id}`, { isActive: !category.isActive }, { withCredentials: true });
      setCategories((current) => current.map((item) => item._id === category._id
        ? { ...item, isActive: !item.isActive }
        : item));
      toast.success(`Category ${category.isActive ? 'hidden' : 'made available'}.`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update category.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Marketplace catalog</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Service categories</h1>
        <p className="mt-1 text-sm text-slate-500">Active categories appear in search and provider applications. Renaming a category updates associated services.</p>
      </div>

      <form onSubmit={saveCategory} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row">
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80}
          placeholder={editing ? 'Edit category name' : 'Add a category'} className="input-field flex-1" />
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-60">
          {editing ? <FaCheck /> : <FaPlus />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Add category'}
        </button>
        {editing && <button type="button" onClick={resetForm} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"><FaTimes className="inline mr-2" />Cancel</button>}
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No service categories configured.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((category) => (
              <div key={category._id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{category.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{category.serviceCount || 0} services · {category.slug}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${category.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {category.isActive ? 'Active' : 'Hidden'}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setEditing(category); setName(category.name); }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><FaEdit /> Rename</button>
                  <button type="button" onClick={() => toggleCategory(category)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${category.isActive ? 'bg-amber-50 text-amber-800 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>
                    {category.isActive ? 'Hide' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageServices;
