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
    <div className="min-h-screen flex bg-admin-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-4 text-admin-700 font-bold text-xl">Football CRM</div>
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
        <header className="bg-white p-4 shadow">
          <div className="flex items-center justify-between">
            {/* LEFT: greeting */}
            <div className="text-admin-700 font-semibold">
              Здравствуйте{user?.email ? `, ${user.email}` : ""}
            </div>

            {/* RIGHT: branch + actions */}
            <div className="flex items-center gap-3">
              {/* Branch badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-admin-50 border text-sm text-admin-700">
                <BuildingOffice2Icon className="h-4 w-4 text-admin-500" />
                <span className="font-medium">
                  {branchName ?? "Филиал не выбран"}
                </span>
              </div>

              {/* Switch branch */}
              {canSwitchBranch && (
                <button
                  onClick={() => navigate("/admin/branch-select")}
                  className="text-sm px-3 py-1.5 border rounded-md hover:bg-gray-100"
                >
                  Сменить
                </button>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-admin-500 text-white rounded-md hover:bg-admin-700 text-sm"
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