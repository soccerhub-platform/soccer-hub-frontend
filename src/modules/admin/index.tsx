import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ContractsPage from './Contracts';
import PaymentsPage from './Payments';
import UsersPage from './Users';
import AdminLayout from './AdminLayout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import CoachesPage from './сoaches/CoachesPage';
import StudentsPage from './students/StudentsPage';
import StudentDetailsPage from './students/StudentDetailsPage';
import ChangePasswordPage from '../../shared/components/ChangePassword';
import GroupsPage from './groups/GroupsPage';
import GroupDetailsPage from './groups/GroupDetailsPage';
import SessionDetailsPage from './groups/SessionDetailsPage';
import SessionAttendancePage from './groups/SessionAttendancePage';
import { AdminBranchProvider } from './BranchContext';
import BranchSelectPage from './branches/BranchSelectPage';
import BranchGuard from './branches/BranchGuard';
import LeadKanbanPage from './leads/LeadKanbanPage';
import AdminProfilePage from './ProfilePage';
import SchedulePage from './SchedulePage';
import CoachDetailsPage from './сoaches/CoachDetailsPage';

/**
 * Defines routes for the admin module.  Admins have access to
 * contracts, payments and user management.  Unauthenticated or
 * unauthorized users are redirected to the shared `/login`.  */
const AdminRoutes: React.FC = () => {
  return (
    <AdminBranchProvider>
      <Routes>
        {/* Public */}
        <Route path="login" element={<Navigate to="/login" replace />} />
        <Route path="change-password" element={<ChangePasswordPage />} />

        {/* Protected by role */}
        <Route element={<ProtectedRoute roles={["ADMIN", "SUPER_ADMIN"]} redirectTo="/login" />}>
          
          {/* Branch selection (ДО layout) */}
          <Route path="branch-select" element={<BranchSelectPage />} />

          {/* Branch required area */}
          <Route element={<BranchGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:playerId" element={<Navigate to="overview" replace />} />
              <Route path="students/:playerId/:section" element={<StudentDetailsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="coaches" element={<CoachesPage />} />
              <Route path="coaches/:coachId" element={<Navigate to="overview" replace />} />
              <Route path="coaches/:coachId/:section" element={<CoachDetailsPage />} />
              <Route path="leads" element={<LeadKanbanPage />} />
              <Route path="groups" element={<GroupsPage />} />
              <Route path="groups/:groupId" element={<Navigate to="overview" replace />} />
              <Route path="groups/:groupId/sessions/:sessionId/attendance" element={<SessionAttendancePage />} />
              <Route path="groups/:groupId/sessions/:sessionId" element={<SessionDetailsPage />} />
              <Route path="groups/:groupId/:section" element={<GroupDetailsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />
            </Route>
          </Route>

        </Route>
      </Routes>
    </AdminBranchProvider>
  );
};

export default AdminRoutes;
