import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
// Import outline icons for the admin navigation menu
import {
  HomeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../shared/AuthContext';

/**
 * Layout component for administrator pages.  Provides a sidebar
 * navigation menu and header with logout button.  Uses a purple
 * colour palette to differentiate from the dispatcher module.
 */
const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  // Class builder for admin navigation links.  Adds flex layout and
  // transition effects, and applies active styling when selected.
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-admin-500 text-white'
        : 'text-admin-700 hover:bg-admin-100 hover:text-admin-700'
    }`;

  return (
    <div className="min-h-screen flex bg-admin-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 text-admin-700 font-bold text-xl">Football CRM</div>
        <nav className="mt-4 space-y-1">
          <NavLink to="/admin/dashboard" className={linkClasses} end>
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>Панель</span>
          </NavLink>
          <NavLink to="/admin/contracts" className={linkClasses}>
            <DocumentTextIcon className="h-5 w-5 mr-3" />
            <span>Контракты</span>
          </NavLink>
          <NavLink to="/admin/payments" className={linkClasses}>
            <CreditCardIcon className="h-5 w-5 mr-3" />
            <span>Платежи</span>
          </NavLink>
          <NavLink to="/admin/users" className={linkClasses}>
            <UserIcon className="h-5 w-5 mr-3" />
            <span>Пользователи</span>
          </NavLink>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white p-4 shadow">
          <div className="text-admin-700 font-semibold">Здравствуйте{user ? `, ${user.username}` : ''}</div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-admin-500 text-white rounded-md hover:bg-admin-700"
          >
            Выйти
          </button>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;