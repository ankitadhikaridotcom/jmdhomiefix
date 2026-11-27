import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BrandLogo from '../../components/common/BrandLogo';
import { getDefaultRouteForUser } from '../../utils/authRedirect';

const Register = () => {
  const navigate = useNavigate();
  const { register: createAccount, verifyEmail, resendVerification, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (isAuthenticated && user && !pendingVerification) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const onSubmit = async ({ name, email, password }) => {
    setIsLoading(true);
    try {
      const res = await createAccount({ name: name.trim(), email: email.trim(), password });
      toast.success(res?.message || 'Account created successfully!');
      if (res?.user && res.user.emailVerified === false) {
        setPendingVerification({ email: res.user.email, emailSent: res.emailSent, user: res.user });
      } else {
        navigate(getDefaultRouteForUser(res?.user), { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      return toast.error('Enter the 6-digit verification code.');
    }
    setVerifying(true);
    try {
      const res = await verifyEmail(otp.trim());
      toast.success(res.message || 'Email verified!');
      navigate(getDefaultRouteForUser(res.user || pendingVerification?.user), { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Invalid verification code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const res = await resendVerification();
      toast.success(res.message || 'Verification code sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding with Cleaning Service Photography */}
      <div className="hidden lg:flex lg:w-5/12 bg-[#1a1a18] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/deep-home-cleaning.jpg"
            alt="Professional Deep Home Cleaning Service"
            className="h-full w-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a18]/92 via-[#1a1a18]/72 to-[#1a1a18]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a18]/65 via-transparent to-[#1a1a18]/85" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-[#f7f5f0]">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <BrandLogo size="lg" variant="inverse" subtitle="HOME SERVICES" className="mb-8" />
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight text-[#f7f5f0]">
              Get home services<br />
              <span className="text-[#ebe8df] underline decoration-[#b3261e] decoration-4 underline-offset-8">without the hassle.</span>
            </h1>
            <p className="text-[#ebe8df]/90 mt-5 text-base leading-relaxed max-w-sm">
              Create an account to find trusted professionals and manage your bookings.
            </p>
            <div className="mt-10 space-y-5">
              {[
                'Trusted professionals for your home',
                'Simple, convenient booking',
                'All your services in one place',
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b3261e] text-xs font-bold text-white">✓</span>
                  <span className="text-sm text-[#ebe8df]/90">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-6">
            <BrandLogo size="md" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            {pendingVerification ? (
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-3">
                    Email Verification
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {pendingVerification.emailSent
                      ? `We sent a 6-digit verification code to ${pendingVerification.email}.`
                      : `Account created for ${pendingVerification.email}. Enter your code or click Resend Code.`}
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label htmlFor="verify-otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      id="verify-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="input-field text-center text-lg font-mono tracking-[0.4em]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifying}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {verifying ? <LoadingSpinner size="sm" /> : 'Verify Email & Continue'}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(getDefaultRouteForUser(pendingVerification.user), { replace: true })}
                    className="font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Verify later →
                  </button>
                </div>
              </div>
            ) : (
              <>
            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-500 text-sm mt-1 mb-6">Sign up with your name, email, and password.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <div className="relative">
                  <FaUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    id="register-name"
                    autoComplete="name"
                    {...register('name', { required: 'Name is required.' })}
                    placeholder="Enter your name"
                    className="input-field pl-11"
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    {...register('email', {
                      required: 'Email is required.',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
                    })}
                    placeholder="Enter your email"
                    className="input-field pl-11"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    {...register('password', {
                      required: 'Password is required.',
                      minLength: { value: 6, message: 'Password must be at least 6 characters.' },
                    })}
                    placeholder="Create a password"
                    className="input-field pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : <>Create account <FaArrowRight className="text-xs" /></>}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Log in</Link>
            </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
