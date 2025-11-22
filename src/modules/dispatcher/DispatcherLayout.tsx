import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
// Import outline icons from Heroicons for navigation
import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../shared/AuthContext';

/**
 * Layout component for dispatcher pages.  Provides a sidebar with
 * navigation links and a header containing a logout button.  The
 * Outlet renders the nested route corresponding to the current page.
 */
const DispatcherLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/dispatcher/login');
  };

  // Define the class for nav links. The returned string includes
  // padding and transition styles, and applies active styles when
  // the NavLink is selected.
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-dispatcher-500 text-white'
        : 'text-dispatcher-700 hover:bg-dispatcher-100 hover:text-dispatcher-700'
    }`;

  return (
    <div className="min-h-screen flex bg-dispatcher-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 text-dispatcher-700 font-bold text-xl">Football CRM</div>
        <nav className="mt-4 space-y-1">
          <NavLink to="/dispatcher/dashboard" className={linkClasses} end>
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>Панель</span>
          </NavLink>
          <NavLink to="/dispatcher/clubs" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Клубы и филиалы</span>
          </NavLink>
          <NavLink to="/dispatcher/admins" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Администраторы</span>
          </NavLink>
          <NavLink to="/dispatcher/clients" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Клиенты</span>
          </NavLink>
          <NavLink to="/dispatcher/trial-trainings" className={linkClasses}>
            <CalendarIcon className="h-5 w-5 mr-3" />
            <span>Пробные тренировки</span>
          </NavLink>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white p-4 shadow">
          <div className="text-dispatcher-700 font-semibold">Добро пожаловать{user ? `, ${user.email}` : ''}</div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
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

export default DispatcherLayout;