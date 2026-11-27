import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BrandLogo from '../../components/common/BrandLogo';
import { getDefaultRouteForUser } from '../../utils/authRedirect';

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyLoginOtp, resendLoginOtp, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpChallenge, setOtpChallenge] = useState(null); // { challengeToken, email }
  const [loginOtp, setLoginOtp] = useState('');
  const [otpResending, setOtpResending] = useState(false);
  const [resetMode, setResetMode] = useState(false); // false | 'request' | 'confirm'
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // If already authenticated, redirect to role's landing page
  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await login({ email: data.email, password: data.password });
      if (res?.requiresOtp && res?.challengeToken) {
        setOtpChallenge({ challengeToken: res.challengeToken, email: res.email || data.email });
        setLoginOtp('');
        toast.success(res.message || 'Verification code sent to your email.');
        return;
      }
      toast.success(res?.otpSkippedNote ? 'Welcome back!' : 'Welcome back! 🎉');
      navigate(getDefaultRouteForUser(res?.user), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(loginOtp.trim())) {
      return toast.error('Enter the 6-digit security code sent to your email.');
    }
    setIsLoading(true);
    try {
      const res = await verifyLoginOtp({
        challengeToken: otpChallenge.challengeToken,
        otp: loginOtp.trim(),
      });
      toast.success('Login verified! Welcome back 🎉');
      navigate(getDefaultRouteForUser(res?.user), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid or expired security code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!otpChallenge?.challengeToken) return;
    setOtpResending(true);
    try {
      const res = await resendLoginOtp({ challengeToken: otpChallenge.challengeToken });
      toast.success(res.message || 'New code sent to your email.');
    } catch (err) {
      toast.error(err.message || 'Failed to resend code.');
    } finally {
      setOtpResending(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return toast.error('Enter your account email.');
    setResetLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Could not send reset code.');
      toast.success(data.message || 'Reset code sent!');
      setResetMode('confirm');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset code.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(resetOtp.trim())) return toast.error('Enter the 6-digit reset code.');
    if (resetPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    setResetLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
          newPassword: resetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to reset password.');
      toast.success(data.message || 'Password updated! Please log in.');
      setResetMode(false);
      setResetOtp('');
      setResetPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding with Cleaning Service Photography */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a18] relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/deep-home-cleaning.jpg"
            alt="Professional Deep Home Cleaning Service"
            className="h-full w-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a18]/92 via-[#1a1a18]/72 to-[#1a1a18]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a18]/65 via-transparent to-[#1a1a18]/85" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-[#f7f5f0]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BrandLogo size="lg" variant="inverse" subtitle="HOME SERVICES" className="mb-8" />
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight text-[#f7f5f0]">
              Welcome back to<br />
              <span className="text-[#ebe8df] underline decoration-[#b3261e] decoration-4 underline-offset-8">Nivestry</span>
            </h1>
            <p className="text-[#ebe8df]/90 mt-5 text-lg leading-relaxed max-w-md">
              Your trusted marketplace for home services. Book verified professionals in minutes.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { num: '10K+', text: 'Happy Customers' },
                { num: '500+', text: 'Verified Professionals' },
                { num: '4.8★', text: 'Average Rating' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[#b3261e]" />
                  <span className="font-semibold text-[#f7f5f0]">{stat.num}</span>
                  <span className="text-[#ebe8df]/85">{stat.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-8">
            <BrandLogo size="md" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            {otpChallenge ? (
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#b3261e] text-[11px] font-bold uppercase tracking-wider mb-3">
                    2-Step Security Verification
                  </span>
                  <h2 className="text-2xl font-bold text-gray-900">Enter Login Code</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    We sent a 6-digit security code to <strong>{otpChallenge.email}</strong>. Enter it below to complete sign-in.
                  </p>
                </div>

                <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                  <div>
                    <label htmlFor="login-otp" className="block text-sm font-medium text-gray-700 mb-1.5">
                      6-Digit Security Code
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="input-field text-center text-lg font-mono tracking-[0.4em]"
                      autoFocus
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Sign In'}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={handleResendLoginOtp}
                    disabled={otpResending}
                    className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    {otpResending ? 'Sending...' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpChallenge(null);
                      setLoginOtp('');
                    }}
                    className="font-semibold text-gray-500 hover:text-gray-800"
                  >
                    ← Use another account
                  </button>
                </div>
              </div>
            ) : resetMode ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {resetMode === 'request'
                      ? 'Enter your email to receive a 6-digit password reset code.'
                      : `Enter the 6-digit code sent to ${resetEmail} and your new password.`}
                  </p>
                </div>

                {resetMode === 'request' ? (
                  <form onSubmit={handleRequestReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="input-field"
                        required
                      />
                    </div>
                    <button type="submit" disabled={resetLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                      {resetLoading ? <LoadingSpinner size="sm" /> : 'Send Reset Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">6-Digit Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="input-field text-center font-mono tracking-[0.35em]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="input-field"
                        required
                      />
                    </div>
                    <button type="submit" disabled={resetLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60">
                      {resetLoading ? <LoadingSpinner size="sm" /> : 'Update Password'}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  ← Back to Login
                </button>
              </div>
            ) : (
              <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-500 text-sm mt-1">Login to your Nivestry account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    id="login-email"
                    type="email"
                    {...register('email', {
                      required: 'Email is required.',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' },
                    })}
                    placeholder="Enter your email"
                    className="input-field pl-11"
                    autoComplete="username"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setResetMode('request')}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: 'Password is required.' })}
                    placeholder="Enter your password"
                    className="input-field pl-11 pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <motion.button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Login'}
              </motion.button>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700">
                Sign Up
              </Link>
            </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
