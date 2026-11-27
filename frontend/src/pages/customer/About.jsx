import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin
} from 'lucide-react';

const stats = [
  { value: '15,000+', label: 'Happy Homeowners' },
  { value: '500+', label: 'Certified Pros' },
  { value: '98.5%', label: 'On-Time Completion' },
  { value: '4.9 ★', label: 'Customer Rating' },
];

const values = [
  {
    icon: ShieldCheck,
    title: 'Trust & Verification',
    desc: 'Every service partner undergoes identity document verification, background screening, and administrative approval before listing services.',
  },
  {
    icon: Award,
    title: 'Transparent Standards',
    desc: 'Upfront pricing across fixed, inspection, hourly, and custom quote models ensures clarity with zero hidden fees.',
  },
  {
    icon: Users,
    title: 'Local Empowerment',
    desc: 'We equip skilled technicians, specialists, and relocation crews with digital tools to grow sustainable local businesses.',
  },
  {
    icon: Sparkles,
    title: 'Tailored Flexibility',
    desc: 'Beyond standard categories, our Custom Service Request workflow connects homeowners directly with nearby available professionals.',
  },
];

const commitments = [
  'Background-Verified Professionals',
  'Transparent & Itemized Pricing',
  'Location-Matched Dispatch',
  'Dedicated Quality Assurance',
];

const About = () => {
  return (
    <div className="min-h-screen bg-[#f7f5f0] text-[#1a1a18]">
      {/* Hero Section — Uniform with Homepage Editorial Palette */}
      <section className="relative bg-[#1a1a18] text-[#f7f5f0] border-b border-[#2b2b28] overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#b3261e]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 bottom-0 w-72 h-72 bg-[#ebe8df]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-22 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f7f5f0]/20 bg-[#f7f5f0]/10 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-[#f7f5f0]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b3261e] text-[#f7f5f0]">
                <CheckCircle2 className="w-3 h-3" />
              </span>
              <span>About Nivestry</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1] text-[#f7f5f0]">
              Raising the Standard for{' '}
              <span className="text-[#ebe8df] underline decoration-[#b3261e] decoration-4 underline-offset-8">
                Home Services
              </span>
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base text-[#ebe8df]/85 leading-relaxed">
              Nivestry connects homeowners with vetted electricians, plumbers, technicians, cleaning specialists, and moving crews through transparent pricing and reliable scheduling.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Numerical Stats Banner — Matching Homepage */}
      <section className="border-b border-[#dedad0] bg-[#ebe8df]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-4 py-8 text-center sm:px-6 md:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="border-r last:border-0 border-[#dedad0]">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight font-mono">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6a675f] uppercase tracking-wide">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission & Standards Section */}
      <section className="py-14 sm:py-20 bg-[#f7f5f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7 space-y-5"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Our Mission</p>
                <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
                  Dependable Doorstep Expertise Without Guesswork
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#4a4842] leading-relaxed">
                Finding qualified home maintenance professionals often involves uncertain pricing, unverified contacts, and missed appointments. Nivestry was established to replace that uncertainty with a structured, accountable marketplace.
              </p>
              <p className="text-sm sm:text-base text-[#4a4842] leading-relaxed">
                Whether booking a scheduled repair from our catalog or submitting a custom service request matched by live location, homeowners work exclusively with{' '}
                <strong className="text-[#1a1a18]">verified and approved professionals</strong> committed to punctual, high-quality execution.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {commitments.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 rounded-xl bg-white border border-[#dedad0] px-4 py-3 text-xs sm:text-sm font-semibold text-[#1a1a18]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#b3261e] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-5 space-y-4"
            >
              <div className="rounded-3xl bg-white border border-[#dedad0] p-6 sm:p-8 shadow-xs space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1a1a18]">Verified Partner Onboarding</h3>
                    <p className="text-xs text-[#6a675f] mt-1 leading-relaxed">
                      Every provider completes a six-step application covering identity verification, service area setup, and quality review.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#ebe8df] pt-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1a1a18]">Precision Location Matching</h3>
                    <p className="text-xs text-[#6a675f] mt-1 leading-relaxed">
                      Smart radius filtering ensures requests reach qualified professionals operating near your neighborhood.
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#ebe8df] pt-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#b3261e]/10 text-[#b3261e] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1a1a18]">Accountable Scheduling</h3>
                    <p className="text-xs text-[#6a675f] mt-1 leading-relaxed">
                      Real-time booking status updates, email confirmations, and responsive customer support from start to completion.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-14 sm:py-20 bg-[#ebe8df] border-y border-[#dedad0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#b3261e]">Core Principles</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#1a1a18] tracking-tight">
              The Standards That Guide Us
            </h2>
            <p className="mt-2 text-sm text-[#6a675f]">
              Every feature on Nivestry is designed around reliability, transparency, and respect for your home.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl bg-[#f7f5f0] border border-[#dedad0] p-6 hover:border-[#b3261e]/40 hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-white border border-[#dedad0] text-[#b3261e] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#1a1a18]">{v.title}</h3>
                  <p className="text-xs sm:text-sm text-[#6a675f] mt-2 leading-relaxed">{v.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Formal CTA Banner — Matching Homepage */}
      <section className="px-4 py-14 sm:px-6 lg:px-8 bg-[#f7f5f0]">
        <div className="mx-auto max-w-6xl rounded-3xl bg-[#1a1a18] px-6 py-12 sm:px-12 sm:py-14 text-[#f7f5f0] relative overflow-hidden shadow-xl border border-[#2b2b28]">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#b3261e]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-[#b3261e]/20 text-[#f7f5f0] border border-[#b3261e]/30 uppercase tracking-wider">
                Trusted By 15,000+ Homeowners
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#f7f5f0]">
                Ready to experience Nivestry?
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#ebe8df]/85 leading-relaxed">
                Explore verified home services in your area or submit a custom request tailored to your schedule.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 rounded-xl bg-[#b3261e] hover:bg-[#9c2019] px-6 py-3.5 text-sm font-bold text-white shadow-md transition"
              >
                <span>Browse Services</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/help"
                className="inline-flex items-center gap-2 rounded-xl border border-[#383833] bg-[#2b2b28] hover:bg-[#383833] px-5 py-3.5 text-sm font-bold text-[#ebe8df] transition"
              >
                <span>Help Center</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
