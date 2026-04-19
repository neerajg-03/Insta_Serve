import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'customer' | 'provider' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const location = useLocation();
  const { user, token, isLoading } = useSelector((state: RootState) => state.auth);

  // Show loading spinner while checking authentication
  if (isLoading && token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If token exists but no user data yet, wait (this handles refresh scenario)
  if (token && !user && !isLoading) {
    // Try to get user data, but don't redirect immediately
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    const roleRedirects: Record<string, string> = {
      customer: '/dashboard',
      provider: '/provider',
      admin: '/admin'
    };
    
    // Redirect to the appropriate dashboard for the user's role
    const userRole = user?.role || 'customer';
    return <Navigate to={roleRedirects[userRole]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
