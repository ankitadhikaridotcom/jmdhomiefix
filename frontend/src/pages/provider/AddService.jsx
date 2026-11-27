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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/provider')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">Add New Service</h1>
            <p className="text-gray-500 mt-1">
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

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/provider/services')}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
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
