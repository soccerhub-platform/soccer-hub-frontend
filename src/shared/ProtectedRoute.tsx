import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role, useAuth } from './AuthContext';

export interface ProtectedRouteProps {
  role?: Role;
  redirectTo: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role, redirectTo }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;