import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';

const DispatcherLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/dispatcher/login');
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-dispatcher-500 text-white' : 'text-dispatcher-700 hover:bg-dispatcher-100'
    }`;

  return (
    <div className="min-h-screen flex bg-dispatcher-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 text-dispatcher-700 font-bold text-xl">Football CRM</div>
        <nav className="mt-4 space-y-1">
          <NavLink to="/dispatcher/dashboard" className={linkClasses}>
            Панель
          </NavLink>
          <NavLink to="/dispatcher/clients" className={linkClasses}>
            Клиенты
          </NavLink>
          <NavLink to="/dispatcher/trial-trainings" className={linkClasses}>
            Пробные тренировки
          </NavLink>
        </nav>
      </aside>
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between bg-white p-4 shadow">
          <div className="text-dispatcher-700 font-semibold">
            Добро пожаловать{user ? `, ${user.username}` : ''}
          </div>
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