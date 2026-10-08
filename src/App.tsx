import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/AuthContext';
import LoginPage from './modules/auth/Login';
import AccessDeniedPage from './shared/AccessDeniedPage';
import { Toaster } from 'react-hot-toast';

const DispatcherRoutes = React.lazy(() => import('./modules/dispatcher'));
const AdminRoutes = React.lazy(() => import('./modules/admin'));
const CoachRoutes = React.lazy(() => import('./modules/coach'));

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
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "12px",
            padding: "12px 16px",
            maxWidth: "420px",
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


      <Suspense fallback={<div className="min-h-screen bg-[#eef5f1]" aria-label="Загрузка приложения" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<AccessDeniedPage />} />
          {/* Dispatcher module */}
          <Route path="/dispatcher/*" element={<DispatcherRoutes />} />
          {/* Admin module */}
          <Route path="/admin/*" element={<AdminRoutes />} />
          {/* Coach module */}
          <Route path="/coach/*" element={<CoachRoutes />} />
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
};

export default App;
