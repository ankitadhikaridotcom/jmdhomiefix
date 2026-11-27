import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Protects routes that require authentication and optional role authorization
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) return null; // Could render a loader
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const hasProviderAccess = user?.providerStatus === 'approved'
    || (user?.role === 'provider' && user?.verificationStatus === 'approved');
  const isAllowed = !allowedRoles || allowedRoles.some((role) => (
    role === 'provider'
      ? hasProviderAccess
      : role === 'customer'
        ? (user?.role === 'customer' || hasProviderAccess)
        : user?.role === role
  ));
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  return children || <Outlet />;
};

export default ProtectedRoute;

