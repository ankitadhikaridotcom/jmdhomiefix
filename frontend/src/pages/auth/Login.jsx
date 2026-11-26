import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BrandLogo from '../../components/common/BrandLogo';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  // If already authenticated, redirect
  if (isAuthenticated && user) {
    navigate('/', { replace: true }); return null;
  }

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login({ email: data.email, password: data.password });
      toast.success('Welcome back! 🎉');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
