import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/AuthContext';
import DispatcherRoutes from './modules/dispatcher';
import AdminRoutes from './modules/admin';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dispatcher/login" replace />} />
        <Route path="/dispatcher/*" element={<DispatcherRoutes />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<Navigate to="/dispatcher/login" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;