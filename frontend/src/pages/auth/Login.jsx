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
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <BrandLogo size="lg" artwork className="mb-8" />
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Welcome back to<br />
              <span className="text-secondary-400">HomeFix</span>
            </h1>
            <p className="text-blue-100 mt-4 text-lg leading-relaxed max-w-md">
              Your trusted marketplace for home services. Book verified professionals in minutes.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { num: '10K+', text: 'Happy Customers' },
                { num: '500+', text: 'Verified Professionals' },
                { num: '4.8⭐', text: 'Average Rating' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-secondary-400" />
                  <span className="font-semibold">{stat.num}</span>
                  <span className="text-blue-200">{stat.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
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
              <p className="text-gray-500 text-sm mt-1">Login to your HomeFix account</p>
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
