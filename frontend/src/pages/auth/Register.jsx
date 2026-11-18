import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Register = () => {
  const navigate = useNavigate();
  const { register: createAccount } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ name, email, password }) => {
    setIsLoading(true);
    try {
      await createAccount({ name: name.trim(), email: email.trim(), password });
      toast.success('Account created successfully!');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/" className="flex items-center gap-2 mb-8">
              <span className="text-4xl">🏠</span>
              <span className="text-2xl font-bold">Home<span className="text-secondary-400">Fix</span></span>
            </Link>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight">
              Get home services<br />without the hassle.
            </h1>
            <p className="text-blue-100 mt-4 text-base leading-relaxed max-w-sm">
              Create an account to find trusted professionals and manage your bookings.
            </p>
            <div className="mt-10 space-y-5">
              {[
                'Trusted professionals for your home',
                'Simple, convenient booking',
                'All your services in one place',
              ].map((text) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="text-lg">✓</span>
                  <span className="text-sm text-blue-100">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-white/5" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-3xl">🏠</span>
              <span className="text-2xl font-bold text-gray-900">Home<span className="text-primary-600">Fix</span></span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
