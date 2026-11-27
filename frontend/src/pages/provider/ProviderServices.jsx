import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ServiceManager from '../../components/provider/ServiceManager';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProviderServices = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        toast.error('Failed to load services');
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, []);

  return (
    <div className="space-y-6 pb-16">
      <ServiceManager
        services={services}
        setServices={setServices}
        categories={categories}
        user={user}
        loading={loading}
        title="My Services & Offerings"
        subtitle="Add, edit, duplicate, toggle active status, preview, or delete your service listings."
        defaultView="grid"
      />
    </div>
  );
};

export default ProviderServices;
