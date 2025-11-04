import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role, useAuth } from './AuthContext';

export interface ProtectedRouteProps {
  /**
   * Optional role that the user must have to access the route.  If
   * provided and the user has a different role, they will be
   * redirected.  */
  role?: Role;
  /**
   * The path to redirect unauthenticated users to.  */
  redirectTo: string;
}

/**
 * Renders an Outlet if the user is authenticated and (optionally)
 * has the required role.  Otherwise redirects to a specified
 * destination.  This component should wrap protected routes in the
 * routing configuration.  */
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