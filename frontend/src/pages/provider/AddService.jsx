import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlus, FaArrowLeft } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  ServiceFormFields,
  buildInitialServiceForm,
  validateServiceForm,
} from '../../components/provider/ServiceFormFields';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AddService = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialServiceForm(user));
  const initializedFromUserRef = useRef(false);

  useEffect(() => {
    fetch(`${API}/api/service-categories`)
      .then((response) => response.json())
      .then((data) => data.success && setCategories((data.categories || []).map((category) => category.name)))
      .catch((error) => toast.error(error.message || 'Failed to load service categories.'));
  }, []);

  useEffect(() => {
    if (user && !initializedFromUserRef.current) {
      initializedFromUserRef.current = true;
      setFormData((prev) => ({
        ...buildInitialServiceForm(user),
        name: prev.name,
        category: prev.category,
        serviceKind: prev.serviceKind,
        estimatedDuration: prev.estimatedDuration,
        highlights: prev.highlights,
        description: prev.description,
        image: prev.image,
        pricingType: prev.pricingType,
        fixedPrice: prev.fixedPrice,
        inspectionFee: prev.inspectionFee,
        visitFee: prev.visitFee,
        hourlyRate: prev.hourlyRate,
        billingIncrement: prev.billingIncrement,
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errorMsg = validateServiceForm(formData);
    if (errorMsg) return toast.error(errorMsg);

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      toast.success('Service added and published successfully!');
      navigate('/provider/services');
    } catch (err) {
      toast.error(err.message || 'Failed to add service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-12">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/provider')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#6a675f] hover:text-[#1a1a18] mb-5 transition"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-[#dedad0] overflow-hidden"
        >
          <div className="p-6 md:p-8 bg-[#1a1a18] text-[#f7f5f0] border-b border-[#2b2b28]">
            <h1 className="text-2xl font-extrabold">Add New Service</h1>
            <p className="text-[#ebe8df]/75 mt-1 text-sm">
              Set service category, kind, pricing model, coverage PIN code, address, and map pin so customers can book you immediately.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <ServiceFormFields
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              user={user}
            />

            <div className="pt-4 border-t border-[#ebe8df] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/provider/services')}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#6a675f] hover:bg-[#ebe8df] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60"
              >
                {loading ? 'Publishing...' : <><FaPlus /> Publish Service</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AddService;
