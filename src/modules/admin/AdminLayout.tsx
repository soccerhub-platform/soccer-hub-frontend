import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };
  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-admin-500 text-white' : 'text-admin-700 hover:bg-admin-100'
    }`;

  return (
    <div className="min-h-screen flex bg-admin-100">
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 text-admin-700 font-bold text-xl">Football CRM</div>
        <nav className="mt-4 space-y-1">
          <NavLink to="/admin/dashboard" className={linkClasses}>Панель</NavLink>
          <NavLink to="/admin/contracts" className={linkClasses}>Контракты</NavLink>
          <NavLink to="/admin/payments" className={linkClasses}>Платежи</NavLink>
          <NavLink to="/admin/users" className={linkClasses}>Пользователи</NavLink>
        </nav>
      </aside>
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