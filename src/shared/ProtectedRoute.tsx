import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Role, useAuth } from './AuthContext';
import { readStoredUser } from './auth-storage';

export interface ProtectedRouteProps {
  role?: Role;
  roles?: Role[];
  redirectTo: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role, roles, redirectTo }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Step 1 — проверяем localStorage сразу
  const storedUser = readStoredUser();

  // Step 2 — user ещё загружается (контекст не успел обновиться)
  if (user === null && storedUser !== null) {
    return null; // можно поставить <Loading/>
  }

  // Step 3 — пользователь не авторизован
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Step 4 — проверяем роль в массиве roles
  const allowedRoles = roles ?? (role ? [role] : undefined);
  if (allowedRoles && !allowedRoles.some((allowedRole) => user.roles.includes(allowedRole))) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
