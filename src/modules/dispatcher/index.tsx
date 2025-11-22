import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import ClientsPage from './Clients';
import TrialTrainingsPage from './TrialTrainings';
import DispatcherLayout from './DispatcherLayout';
import ProtectedRoute from '../../shared/ProtectedRoute';
import ClubsAndBranchesPage from './ClubsAndBranchesPage';
import AdminsPage from './AdminsPage';

/**
 * Defines all routes for the dispatcher module.  Unauthenticated
 * users attempting to access protected pages are redirected to
 * `/dispatcher/login`.  The layout wraps protected pages to
 * provide a consistent sidebar and header.  */
const DispatcherRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public login page */}
      <Route path="login" element={<Login />} />
      {/* Protected pages requiring dispatcher role */}
      <Route element={<ProtectedRoute role="DISPATCHER" redirectTo="/dispatcher/login" />}>        
        <Route element={<DispatcherLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path='clubs' element={<ClubsAndBranchesPage />} />
          <Route path="admins" element={<AdminsPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="trial-trainings" element={<TrialTrainingsPage />} />
          {/* Default when accessing /dispatcher root */}
          <Route index element={<Dashboard />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default DispatcherRoutes;