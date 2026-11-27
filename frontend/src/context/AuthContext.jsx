import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch current authenticated user on mount
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/me`, { withCredentials: true });
        if (res.data.success) {
          setUser(res.data.user);
          setIsAuthenticated(true);
        }
      } catch (e) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, credentials, { withCredentials: true });
      if (res.data.success && !res.data.requiresOtp && res.data.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
      return res.data;
    } catch (err) {
      // Re-throw with the backend's message so the UI can display it
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async ({ challengeToken, otp }) => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/verify-login-otp`,
        { challengeToken, otp },
        { withCredentials: true }
      );
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid login verification code.';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async ({ challengeToken }) => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/auth/resend-login-otp`,
        { challengeToken },
        { withCredentials: true }
      );
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to resend login code.';
      throw new Error(message);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register`, userData, { withCredentials: true });
      if (res.data.success) {
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
      return res.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await axios.post(`${API_BASE}/api/auth/logout`, {}, { withCredentials: true });
    setUser(null);
    setIsAuthenticated(false);
    setLoading(false);
  };

  const refreshUser = async () => {
    const res = await axios.get(`${API_BASE}/api/auth/me`, { withCredentials: true });
    if (!res.data.success || !res.data.user) {
      throw new Error('Failed to refresh account details.');
    }
    setUser(res.data.user);
    setIsAuthenticated(true);
    return res.data.user;
  };

  const updateUser = async (updatedData) => {
    const res = await axios.put(`${API_BASE}/api/profile`, updatedData, { withCredentials: true });
    if (!res.data.success || !res.data.user) {
      throw new Error(res.data.message || 'Failed to update profile.');
    }
    setUser(res.data.user);
    return res.data;
  };

  const verifyEmail = async (otp) => {
    const res = await axios.post(`${API_BASE}/api/auth/verify-email`, { otp }, { withCredentials: true });
    if (res.data.success && res.data.user) {
      setUser(res.data.user);
    }
    return res.data;
  };

  const resendVerification = async () => {
    const res = await axios.post(`${API_BASE}/api/auth/resend-verification`, {}, { withCredentials: true });
    return res.data;
  };

  const updateProviderSettings = async (settings) => {
    try {
      const res = await axios.patch(`${API_BASE}/api/provider/settings`, settings, { withCredentials: true });
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        return res.data;
      }
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update settings';
      throw new Error(msg);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    verifyLoginOtp,
    resendLoginOtp,
    register,
    logout,
    refreshUser,
    updateUser,
    verifyEmail,
    resendVerification,
    updateProviderSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
