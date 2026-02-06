import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  HomeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  UserIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../shared/AuthContext";
import { useAdminBranch } from "./BranchContext";

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { branchName, canSwitchBranch } = useAdminBranch();

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "bg-admin-500 text-white"
        : "text-admin-700 hover:bg-admin-100 hover:text-admin-700"
    }`;

  return (
    <div className="min-h-screen flex app-bg-admin">
      {/* Sidebar */}
      <aside className="w-64 bg-white/90 backdrop-blur border-r border-slate-100 shadow-lg">
        <div className="p-5">
          <div className="heading-font text-admin-700 font-semibold text-lg tracking-tight">
            Football CRM
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Admin Control
          </div>
        </div>
        <nav className="mt-4 space-y-1">
          <NavLink to="/admin/dashboard" className={linkClasses} end>
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>Панель</span>
          </NavLink>
          <NavLink to="/admin/coaches" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Тренеры</span>
          </NavLink>
          <NavLink to="/admin/groups" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Группы</span>
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

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="px-6 pt-5">
          <div className="flex items-center justify-between">
            {/* LEFT: greeting */}
            <div className="glass-card rounded-2xl px-4 py-2.5">
              <div className="heading-font text-admin-700 font-semibold">
                Здравствуйте{user?.email ? `, ${user.email}` : ""}
              </div>
              <div className="text-xs text-slate-500">
                Панель администратора
              </div>
            </div>

            {/* RIGHT: branch + actions */}
            <div className="flex items-center gap-3">
              {/* Branch badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 border border-slate-200 text-sm text-admin-700 shadow-sm">
                <BuildingOffice2Icon className="h-4 w-4 text-admin-500" />
                <span className="font-medium">
                  {branchName ?? "Филиал не выбран"}
                </span>
              </div>

              {/* Switch branch */}
              {canSwitchBranch && (
                <button
                  onClick={() => navigate("/admin/branch-select")}
                  className="text-sm px-3 py-2 border border-slate-200 rounded-xl hover:bg-white shadow-sm"
                >
                  Сменить
                </button>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-2 bg-admin-500 text-white rounded-xl hover:bg-admin-700 text-sm shadow-sm"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Выйти
              </button>
            </div>
          </div>
        </header>

        <main className="p-6 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
