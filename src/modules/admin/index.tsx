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
import GroupsPage from './groups/GroupsPage';
import GroupDetailsPage from './groups/GroupDetailsPage';
import { AdminBranchProvider } from './context/BranchContext';
import BranchSelectPage from './branches/BranchSelectPage';
import BranchGuard from './branches/BranchGuard';

/**
 * Defines routes for the admin module.  Admins have access to
 * contracts, payments and user management.  Unauthenticated or
 * unauthorized users are redirected to `/admin/login`.  */
const AdminRoutes: React.FC = () => {
  return (
    <AdminBranchProvider>
      <Routes>
        {/* Public */}
        <Route path="login" element={<Login />} />
        <Route path="change-password" element={<ChangePasswordPage />} />

        {/* Protected by role */}
        <Route element={<ProtectedRoute role="ADMIN" redirectTo="/admin/login" />}>
          
          {/* Branch selection (ДО layout) */}
          <Route path="branch-select" element={<BranchSelectPage />} />

          {/* Branch required area */}
          <Route element={<BranchGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="coaches" element={<CoachesPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:groupId" element={<GroupDetailsPage />} />
            </Route>
          </Route>

        </Route>
      </Routes>
    </AdminBranchProvider>
  );
};

export default AdminRoutes;