import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../../shared/ProtectedRoute';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const Dashboard = React.lazy(() => import('./Dashboard'));
const DispatcherLayout = React.lazy(() => import('./DispatcherLayout'));
const ClubsAndBranchesPage = React.lazy(() => import('./ClubsAndBranchesPage'));
const AdminsPage = React.lazy(() => import('./AdminsPage'));
const DispatcherLeadsPage = React.lazy(() => import('./leads/DispatcherLeadsPage'));
const DispatcherProfilePage = React.lazy(() => import('./ProfilePage'));

/**
 * Defines all routes for the dispatcher module.  Unauthenticated
 * users attempting to access protected pages are redirected to
 * shared `/login`.  The layout wraps protected pages to
 * provide a consistent sidebar and header.  */
const DispatcherRoutes: React.FC = () => {
  const [queryClient] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
    <Routes>
      {/* Public login page */}
      <Route path="login" element={<Navigate to="/login" replace />} />
      {/* Protected pages requiring dispatcher role */}
      <Route element={<ProtectedRoute role="DISPATCHER" redirectTo="/login" />}>        
        <Route element={<DispatcherLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path='clubs' element={<ClubsAndBranchesPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="leads" element={<DispatcherLeadsPage />} />
          <Route path="clients" element={<Navigate to="/dispatcher/leads" replace />} />
          <Route path="trial-trainings" element={<Navigate to="/dispatcher/leads" replace />} />
          <Route path="profile" element={<DispatcherProfilePage />} />
          {/* Default when accessing /dispatcher root */}
          <Route index element={<Dashboard />} />
          <Route path="*" element={<Navigate to="/dispatcher/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
    </QueryClientProvider>
  );
};

export default DispatcherRoutes;
