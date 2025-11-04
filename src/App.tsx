import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/AuthContext';
import DispatcherRoutes from './modules/dispatcher';
import AdminRoutes from './modules/admin';

/**
 * The root component of the Football CRM application.  It defines
 * high‑level routes for dispatcher and admin modules.  The
 * AuthProvider supplies authentication state and helpers to
 * descendant components.  Users attempting to access the root
 * URL are redirected to the dispatcher login by default.  */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Redirect the bare root to the dispatcher login. */}
        <Route path="/" element={<Navigate to="/dispatcher/login" replace />} />
        {/* Dispatcher module */}
        <Route path="/dispatcher/*" element={<DispatcherRoutes />} />
        {/* Admin module */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/dispatcher/login" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;