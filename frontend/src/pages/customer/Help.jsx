import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  ChevronDown,
  Phone,
  Mail,
  ShieldCheck,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  ClipboardList,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

const faqCategories = [
  {
    id: 'bookings',
    title: 'Bookings & Scheduling',
    subtitle: 'Appointments, rescheduling, and cancellation terms',
    icon: CalendarCheck,
    faqs: [
      {
        q: 'How do I schedule a home service?',
        a: 'Select a category or search for a service from the catalog, review the upfront pricing, choose your preferred date, time slot, and service address, and confirm your booking. You can pay online or choose cash on completion.',
      },
      {
        q: 'What is the cancellation policy?',
        a: 'Bookings may be cancelled free of charge at least 2 hours prior to the scheduled appointment time. Cancellations requested within 2 hours of the slot may be subject to a 25% late cancellation fee to compensate the assigned professional.',
      },
      {
        q: 'How can I reschedule an existing booking?',
        a: 'Open My Bookings from your account menu, locate the appointment, and select Reschedule at least 2 hours before the scheduled slot to pick a new date or time at no additional charge.',
      },
      {
        q: 'What happens if an assigned provider is delayed or unavailable?',
        a: 'If a verified professional cannot arrive on time, please contact our support helpline immediately. We will prioritize assigning an alternative verified provider or process a full refund within 24 hours.',
      },
    ],
  },
  {
    id: 'custom',
    title: 'Custom Service Requests',
    subtitle: 'Tailored jobs, location matching, and provider quotes',
    icon: Sparkles,
    faqs: [
      {
        q: 'How do Custom Service Requests work?',
        a: 'If your requirement is not listed in the standard catalog, visit Request Custom Service, select a category, describe the scope of work (you can use "Make It Professional" to structure your brief), attach optional photos, turn on your location, and submit. Nearby verified providers receive an immediate notification to accept or decline.',
      },
      {
        q: 'How do I choose a provider for a custom request?',
        a: 'Once nearby providers accept your request, you can review their profiles in Request Details, select your preferred professional, and receive an itemized quote before confirming the booking.',
      },
      {
        q: 'Why should I turn on Location when submitting a request?',
        a: 'Turning on Location or pinning your address on the map ensures only verified service providers operating within your service radius are notified, resulting in faster responses and accurate travel estimates.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments, Fees & Refunds',
    subtitle: 'Billing clarity, payment modes, and refund timelines',
    icon: CreditCard,
    faqs: [
      {
        q: 'Which payment methods are supported?',
        a: 'Nivestry supports UPI, major credit and debit cards, net banking, and cash payment upon service completion. Online transactions are encrypted and processed securely.',
      },
      {
        q: 'How is the final booking amount calculated?',
        a: 'Service charges, visit or inspection fees (where applicable), and the 3% platform service fee are displayed clearly before you confirm any booking or approve a custom quote.',
      },
      {
        q: 'How long do refunds take to process?',
        a: 'Eligible refunds for cancelled or unfulfilled online bookings are initiated promptly and typically reflect in your original payment account within 3 to 5 business days.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Partner Onboarding',
    subtitle: 'Profile management and becoming a service provider',
    icon: UserCheck,
    faqs: [
      {
        q: 'How do I manage my profile and saved addresses?',
        a: 'Sign in and open My Profile or Saved Addresses from the top navigation menu to update your contact information, default service address, or pinned map coordinates.',
      },
      {
        q: 'How can I register as a verified service partner?',
        a: 'After signing in with a customer account, select Become a Partner from the profile menu or footer to complete the six-step verification application. Once reviewed and approved by our administration team, you gain access to the Provider Dashboard.',
      },
    ],
  },
  {
    id: 'safety',
    title: 'Safety, Verification & Quality',
    subtitle: 'Provider screening and service assurance',
    icon: ShieldCheck,
    faqs: [
      {
        q: 'How are service professionals verified?',
        a: 'Every service partner completes identity document verification, experience review, and administrative approval before they are permitted to publish services or accept customer requests.',
      },
      {
        q: 'What if the completed work does not meet expectations?',
        a: 'Please reach out to our support team within 48 hours of service completion with your booking ID. Our resolution desk will review the concern and arrange a corrective visit or refund where eligible.',
      },
      {
        q: 'Is my personal and payment information protected?',
        a: 'Yes. Communication is encrypted over HTTPS, authentication uses secure HTTP-only cookies, and sensitive verification documents are stored privately with restricted access.',
      },
    ],
  },
];

const quickLinks = [
  {
    title: 'My Bookings',
    desc: 'Track status, reschedule, or manage active orders',
    to: '/my-bookings',
    icon: ClipboardList,
  },
  {
    title: 'Custom Requests',
    desc: 'Submit tailored jobs to nearby verified providers',
    to: '/request-custom-service',
    icon: Sparkles,
  },
  {
    title: 'Saved Addresses',
    desc: 'Update pinned doorstep locations and landmarks',
    to: '/my-addresses',
    icon: MapPin,
  },
  {
    title: 'Become a Partner',
    desc: 'Apply through our 6-step provider verification',
    to: '/provider-application',
    icon: ShieldCheck,
  },
];

const Help = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openFaq, setOpenFaq] = useState('bookings-0');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCategories = faqCategories
    .filter((cat) => selectedCategory === 'all' || cat.id === selectedCategory)
    .map((cat) => ({
      ...cat,
      faqs: normalizedQuery
        ? cat.faqs.filter(
            (f) =>
              f.q.toLowerCase().includes(normalizedQuery) ||
              f.a.toLowerCase().includes(normalizedQuery)
          )
        : cat.faqs,
    }))
    .filter((cat) => cat.faqs.length > 0);

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1a1a18]">
      {/* Hero Section — Uniform with Homepage Editorial Palette */}
      <section className="relative bg-[#1a1a18] text-[#f7f5f0] border-b border-[#2b2b28] overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#b3261e]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 bg-[#ebe8df]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f7f5f0]/20 bg-[#f7f5f0]/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-[#f7f5f0]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b3261e] text-[#f7f5f0]">
                <HelpCircle className="w-3 h-3" />
              </span>
              <span>Nivestry Help &amp; Support Center</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-[#f7f5f0]">
              How Can We{' '}
              <span className="text-[#ebe8df] underline decoration-[#b3261e] decoration-4 underline-offset-8">
                Assist You?
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-[#ebe8df]/85 leading-relaxed">
              Browse verified answers on bookings, custom service requests, payments, and safety standards, or reach our dedicated support desk directly.
            </p>

            {/* Pill Search Bar */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="flex items-center rounded-full border border-[#f7f5f0]/25 bg-[#242421] px-4 py-1.5 shadow-xl focus-within:border-[#b3261e] transition-colors">
                <Search className="w-4 h-4 text-[#ebe8df]/70 shrink-0 mr-3" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search help articles (e.g., cancellation, custom request, refund)..."
                  aria-label="Search help articles"
                  className="w-full bg-transparent py-2.5 text-sm text-[#f7f5f0] placeholder:text-[#ebe8df]/60 outline-none border-0 focus:ring-0"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 rounded-full text-[#ebe8df]/70 hover:text-white hover:bg-white/10 transition"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#ebe8df]/80">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-[#b3261e]" />
                <span>Mon–Sat · 8:00 AM – 10:00 PM IST</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#b3261e]" />
                <span>24-Hour Email Resolution SLA</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#b3261e]" />
                <span>Verified Service Assurance</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Portal Shortcuts */}
      <section className="border-b border-[#dedad0] bg-[#ebe8df] py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.to}
                  className="group rounded-2xl bg-[#f7f5f0] border border-[#dedad0] p-5 hover:border-[#b3261e]/40 hover:shadow-md transition-all flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#dedad0] text-[#b3261e] flex items-center justify-center shrink-0 group-hover:bg-[#b3261e] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1a1a18] group-hover:text-[#b3261e] transition-colors flex items-center gap-1">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </p>
                    <p className="text-xs text-[#6a675f] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Knowledge Base</p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="text-xs font-bold text-[#b3261e] hover:underline self-start sm:self-auto"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Topic Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                selectedCategory === 'all'
                  ? 'bg-[#1a1a18] text-[#f7f5f0] border-[#1a1a18]'
                  : 'bg-white text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/40'
              }`}
            >
              All Topics
            </button>
            {faqCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                  selectedCategory === cat.id
                    ? 'bg-[#1a1a18] text-[#f7f5f0] border-[#1a1a18]'
                    : 'bg-white text-[#1a1a18] border-[#dedad0] hover:border-[#b3261e]/40'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {filteredCategories.length > 0 ? (
            <div className="space-y-8">
              {filteredCategories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3 pb-2 border-b border-[#dedad0]">
                      <span className="w-9 h-9 rounded-xl bg-[#b3261e]/10 text-[#b3261e] border border-[#b3261e]/20 flex items-center justify-center shrink-0">
                        <CatIcon className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-lg font-extrabold text-[#1a1a18]">{cat.title}</h3>
                        <p className="text-xs text-[#6a675f]">{cat.subtitle}</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {cat.faqs.map((faq, fi) => {
                        const key = `${cat.id}-${fi}`;
                        const isOpen = openFaq === key;
                        return (
                          <div
                            key={key}
                            className={`rounded-2xl bg-white border transition-colors overflow-hidden ${
                              isOpen ? 'border-[#b3261e]/40 shadow-sm' : 'border-[#dedad0] hover:border-[#b3261e]/30'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaq(isOpen ? null : key)}
                              aria-expanded={isOpen}
                              className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-[#f7f5f0]/60 transition-colors"
                            >
                              <span className="font-bold text-[#1a1a18] text-sm sm:text-base">{faq.q}</span>
                              <ChevronDown
                                className={`w-4 h-4 text-[#6a675f] shrink-0 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180 text-[#b3261e]' : ''
                                }`}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-5 pb-5 pt-1 border-t border-[#ebe8df] bg-[#f7f5f0]/50">
                                    <p className="text-sm text-[#4a4842] leading-relaxed pt-3">{faq.a}</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-dashed border-[#dedad0] py-14 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#ebe8df] text-[#b3261e] flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-[#1a1a18]">No matching help articles found</p>
              <p className="text-xs sm:text-sm text-[#6a675f] mt-1">
                No results matched &ldquo;{searchQuery}&rdquo;. Try another keyword or contact our support desk below.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="py-14 bg-[#ebe8df] border-t border-[#dedad0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Direct Support Desk</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
              Still Need Assistance?
            </h2>
            <p className="mt-2 text-sm text-[#6a675f]">
              Our customer resolution specialists are available to assist with active bookings, billing inquiries, and provider coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <a
              href="tel:+917451086410"
              className="group rounded-2xl bg-white border border-[#dedad0] p-6 hover:border-[#b3261e]/40 hover:shadow-md transition-all block"
            >
              <div className="w-11 h-11 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center mb-4 group-hover:bg-[#b3261e] group-hover:text-white transition-colors">
                <Phone className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6a675f]">Direct Helpline</p>
              <p className="text-lg font-extrabold text-[#1a1a18] mt-1 font-mono group-hover:text-[#b3261e] transition-colors">
                +91 7451086410
              </p>
              <p className="text-xs text-[#6a675f] mt-1.5">Monday – Saturday, 8:00 AM – 10:00 PM IST</p>
            </a>

            <a
              href="mailto:support@nivestry.com"
              className="group rounded-2xl bg-white border border-[#dedad0] p-6 hover:border-[#b3261e]/40 hover:shadow-md transition-all block"
            >
              <div className="w-11 h-11 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center mb-4 group-hover:bg-[#b3261e] group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6a675f]">Email Support</p>
              <p className="text-lg font-extrabold text-[#1a1a18] mt-1 group-hover:text-[#b3261e] transition-colors">
                support@nivestry.com
              </p>
              <p className="text-xs text-[#6a675f] mt-1.5">Formal written response within 24 business hours</p>
            </a>

            <div className="rounded-2xl bg-white border border-[#dedad0] p-6">
              <div className="w-11 h-11 rounded-xl bg-[#1a1a18] text-[#f7f5f0] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6a675f]">Service Guarantee</p>
              <p className="text-lg font-extrabold text-[#1a1a18] mt-1">Priority Resolution</p>
              <p className="text-xs text-[#6a675f] mt-1.5">
                Active booking issues and service quality escalations are prioritized within 2 hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Formal CTA Banner — Matching Homepage */}
      <section className="px-4 py-14 sm:px-6 lg:px-8 bg-[#f7f5f0]">
        <div className="mx-auto max-w-5xl rounded-3xl bg-[#1a1a18] px-6 py-10 sm:px-10 sm:py-12 text-[#f7f5f0] relative overflow-hidden shadow-xl border border-[#2b2b28]">
          <div className="absolute -right-20 -bottom-20 w-72 h-72 bg-[#b3261e]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-[#b3261e]/20 text-[#f7f5f0] border border-[#b3261e]/30 uppercase tracking-wider">
                Ready When You Are
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f7f5f0]">
                Book a verified specialist or post a custom request
              </h2>
              <p className="mt-2 text-sm text-[#ebe8df]/85 leading-relaxed">
                Explore transparent service categories or describe a custom home task for nearby professionals.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] px-5 py-3 text-sm font-bold text-white shadow-md transition"
              >
                <span>Browse Services</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/request-custom-service"
                className="inline-flex items-center gap-2 rounded-xl border border-[#383833] bg-[#2b2b28] hover:bg-[#383833] px-5 py-3 text-sm font-bold text-[#ebe8df] transition"
              >
                <span>Request Custom Service</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;
