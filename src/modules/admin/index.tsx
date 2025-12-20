import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import ContractsPage from './Contracts';
import PaymentsPage from './Payments';
import UsersPage from './Users';
import AdminLayout from './AdminLayout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import CoachesPage from './сoaches/CoachesPage';
import ChangePasswordPage from '../../shared/components/ChangePassword';

/**
 * Defines routes for the admin module.  Admins have access to
 * contracts, payments and user management.  Unauthenticated or
 * unauthorized users are redirected to `/admin/login`.  */
const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Admin login */}
      <Route path="login" element={<Login />} />
      <Route path="change-password" element={<ChangePasswordPage />} />

      {/* Protected area requiring ADMIN role */}
      <Route element={<ProtectedRoute role="ADMIN" redirectTo="/admin/login" />}>        
        <Route element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="coaches" element={<CoachesPage />} />
          <Route index element={<Dashboard />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AdminRoutes;