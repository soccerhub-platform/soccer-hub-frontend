import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { AdminBranchProvider } from './BranchContext';

const Dashboard = React.lazy(() => import('./Dashboard'));
const ContractsPage = React.lazy(() => import('./Contracts'));
const PaymentsPage = React.lazy(() => import('./Payments'));
const UsersPage = React.lazy(() => import('./Users'));
const AdminLayout = React.lazy(() => import('./AdminLayout'));
const CoachesPage = React.lazy(() => import('./сoaches/CoachesPage'));
const StudentsPage = React.lazy(() => import('./students/StudentsPage'));
const StudentDetailsPage = React.lazy(() => import('./students/StudentDetailsPage'));
const ChangePasswordPage = React.lazy(() => import('../../shared/components/ChangePassword'));
const GroupsPage = React.lazy(() => import('./groups/GroupsPage'));
const GroupDetailsPage = React.lazy(() => import('./groups/GroupDetailsPage'));
const SessionDetailsPage = React.lazy(() => import('./groups/SessionDetailsPage'));
const SessionAttendancePage = React.lazy(() => import('./groups/SessionAttendancePage'));
const BranchSelectPage = React.lazy(() => import('./branches/BranchSelectPage'));
const BranchGuard = React.lazy(() => import('./branches/BranchGuard'));
const LeadKanbanPage = React.lazy(() => import('./leads/LeadKanbanPage'));
const LeadDetailsPage = React.lazy(() => import('./leads/LeadDetailsPage'));
const AdminProfilePage = React.lazy(() => import('./ProfilePage'));
const SchedulePage = React.lazy(() => import('./SchedulePage'));
const CoachDetailsPage = React.lazy(() => import('./сoaches/CoachDetailsPage'));
const ClientsPage = React.lazy(() => import('./clients/ClientsPage'));
const ClientDetailsPage = React.lazy(() => import('./clients/ClientDetailsPage'));
const ContractDetailsPage = React.lazy(() => import('./contracts/ContractDetailsPage'));
const TrialsPage = React.lazy(() => import('./trials/TrialsPage'));
const TrialDetailsPage = React.lazy(() => import('./trials/TrialDetailsPage'));

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
              <Route path="contracts/:contractId" element={<Navigate to="overview" replace />} />
              <Route path="contracts/:contractId/:section" element={<ContractDetailsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:playerId" element={<Navigate to="overview" replace />} />
              <Route path="students/:playerId/:section" element={<StudentDetailsPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="clients/:clientId" element={<Navigate to="overview" replace />} />
              <Route path="clients/:clientId/:section" element={<ClientDetailsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="coaches" element={<CoachesPage />} />
              <Route path="coaches/:coachId" element={<Navigate to="overview" replace />} />
              <Route path="coaches/:coachId/:section" element={<CoachDetailsPage />} />
              <Route path="leads" element={<LeadKanbanPage />} />
              <Route path="leads/:leadId" element={<LeadDetailsPage />} />
              <Route path="trials" element={<TrialsPage />} />
              <Route path="trials/:trialId" element={<TrialDetailsPage />} />
              <Route path="trials/:trialId/:section" element={<TrialDetailsPage />} />
              <Route path="sessions/:sessionId/attendance" element={<SessionAttendancePage />} />
              <Route path="sessions/:sessionId" element={<SessionDetailsPage />} />
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
