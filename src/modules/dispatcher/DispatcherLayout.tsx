import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
// Import outline icons from Heroicons for navigation
import {
  HomeIcon,
  UserGroupIcon,
  Squares2X2Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../shared/AuthContext';
import { Button } from '../../shared/ui';

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
    navigate('/login');
  };

  // Define the class for nav links. The returned string includes
  // padding and transition styles, and applies active styles when
  // the NavLink is selected.
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `mx-3 flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-dispatcher-100 text-dispatcher-700 ring-1 ring-blue-100'
        : 'text-slate-600 hover:bg-slate-100 hover:text-dispatcher-700'
    }`;

  return (
    <div className="min-h-screen flex app-bg-dispatcher">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="p-5">
          <div className="heading-font text-dispatcher-700 font-semibold text-lg tracking-tight">
            Football CRM
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Dispatcher Desk
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1">
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
          <NavLink to="/dispatcher/leads" className={linkClasses}>
            <Squares2X2Icon className="h-5 w-5 mr-3" />
            <span>Лиды</span>
          </NavLink>
        </nav>

        <nav className="border-t border-slate-100 p-3">
          <NavLink to="/dispatcher/profile" className={linkClasses}>
            <UserCircleIcon className="h-5 w-5 mr-3" />
            <span>Профиль</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="mx-3 mt-1 flex w-[calc(100%-1.5rem)] items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-rose-700"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            <span>Выйти</span>
          </button>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <div className="glass-card rounded-2xl px-4 py-2.5">
              <div className="heading-font text-dispatcher-700 font-semibold">
                Добро пожаловать{user ? `, ${user.email}` : ''}
              </div>
              <div className="text-xs text-slate-500">Рабочее место диспетчера</div>
            </div>
          <Button variant="secondary" size="sm" onClick={() => navigate("/dispatcher/profile")}>
            <UserCircleIcon className="h-4 w-4" />
            Профиль
          </Button>
          </div>
        </header>
        <main className="p-6 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DispatcherLayout;
