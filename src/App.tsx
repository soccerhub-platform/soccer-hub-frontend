import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/AuthContext';
import DispatcherRoutes from './modules/dispatcher';
import AdminRoutes from './modules/admin';
import { Toaster } from 'react-hot-toast';

/**
 * The root component of the Football CRM application.  It defines
 * high‑level routes for dispatcher and admin modules.  The
 * AuthProvider supplies authentication state and helpers to
 * descendant components.  Users attempting to access the root
 * URL are redirected to the dispatcher login by default.  */
const App: React.FC = () => {
  return (
    <AuthProvider>

      {/* Глобальный toaster */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            padding: "12px 16px",
            background: "#fff",
            color: "#1f2937",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
          },
          success: {
            iconTheme: {
              primary: "#059669",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#dc2626",
              secondary: "#ffffff",
            },
          },
        }}
      />


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