import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import BookingCard from '../../components/customer/BookingCard';
import { ListSkeleton } from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/ui/EmptyState';
import WriteReviewModal from '../../components/customer/WriteReviewModal';

const tabs = ['all', 'upcoming', 'ongoing', 'completed', 'cancelled'];

const MyBookings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null);

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5000/api/bookings', { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setBookings(data.bookings || []);
        } else throw new Error();
      } catch (err) {
        console.error('Failed to load bookings:', err);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };
    loadBookings();
  }, []);

  const filtered = activeTab === 'all'
    ? bookings
    : bookings.filter(b => {
        if (activeTab === 'upcoming') return b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending';
        if (activeTab === 'ongoing') return b.status === 'ongoing' || b.status === 'quote_sent' || b.status === 'quote_approved';
        return b.status === activeTab;
      });

  const handleCancel = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'cancelled' })
      });
      const data = await res.json();
      if (!data.success) throw new Error();

      setBookings(prev => prev.map(b => b.id === id || b._id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled successfully');
    } catch (err) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleReviewClick = (id) => {
    const booking = bookings.find(b => (b.id === id || b._id === id));
    if (booking) {
      setSelectedBookingForReview(booking);
      setIsReviewModalOpen(true);
    }
  };

  const handleReviewSuccess = (id) => {
    setBookings(prev => prev.map(b => (b.id === id || b._id === id) ? { ...b, isReviewed: true } : b));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 sm:pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F1D33] tracking-tight">
            My Bookings
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Track real-time service status, manage appointments, and approve repair quotes.
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 mt-6 bg-slate-200/70 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const count = tab === 'all'
              ? bookings.length
              : bookings.filter(b => {
                  if (tab === 'upcoming') return b.status === 'upcoming' || b.status === 'confirmed' || b.status === 'pending';
                  if (tab === 'ongoing') return b.status === 'ongoing' || b.status === 'quote_sent' || b.status === 'quote_approved';
                  return b.status === tab;
                }).length;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3.5 rounded-xl text-xs sm:text-sm font-semibold capitalize transition-all duration-150 whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0284C7] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono ${
                    isActive ? 'bg-sky-100 text-[#0284C7]' : 'bg-slate-300/60 text-slate-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Booking Cards List */}
        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <ListSkeleton rows={3} />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((booking, i) => (
              <BookingCard
                key={booking.id || booking._id}
                booking={booking}
                index={i}
                onCancel={handleCancel}
                onReview={handleReviewClick}
              />
            ))
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No bookings found"
              description={`You don't have any ${activeTab === 'all' ? '' : activeTab + ' '}bookings recorded yet.`}
              actionLabel="Discover Services"
              onAction={() => navigate('/services')}
            />
          )}
        </div>
      </div>

      <WriteReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        booking={selectedBookingForReview}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
};

export default MyBookings;
