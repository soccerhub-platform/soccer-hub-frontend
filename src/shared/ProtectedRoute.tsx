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

  // Step 1 — проверяем localStorage сразу
  const storedUser = localStorage.getItem('football-crm:user');

  // Step 2 — user ещё загружается (контекст не успел обновиться)
  if (user === null && storedUser !== null) {
    return null; // можно поставить <Loading/>
  }

  // Step 3 — пользователь не авторизован
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Step 4 — проверяем роль в массиве roles
  if (role && !user.roles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;