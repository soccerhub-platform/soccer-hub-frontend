import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CreditCardIcon,
  HomeIcon,
  UserGroupIcon,
  Squares2X2Icon,
  BuildingOffice2Icon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../shared/AuthContext";
import { useAdminBranch } from "./BranchContext";
import { Button } from "../../shared/ui";
import BrandMark from "../../shared/ui/BrandMark";

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { branchName, canSwitchBranch } = useAdminBranch();
  const branchLabel = branchName === "Main Branch" ? "Главный филиал" : branchName;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `mx-3 flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
      isActive
        ? "bg-admin-100 text-admin-800 ring-1 ring-admin-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-admin-700"
    }`;

  return (
    <div className="min-h-screen flex app-bg-admin">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div>
              <div className="heading-font text-admin-700 font-semibold text-lg tracking-tight">
                Club Hub
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Админ-панель
              </div>
            </div>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1">
          <NavLink to="/admin/dashboard" className={linkClasses} end>
            <HomeIcon className="h-5 w-5 mr-3" />
            <span>Панель</span>
          </NavLink>
          <NavLink to="/admin/coaches" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Тренеры</span>
          </NavLink>
          <NavLink to="/admin/leads" className={linkClasses}>
            <Squares2X2Icon className="h-5 w-5 mr-3" />
            <span>Лиды</span>
          </NavLink>
          <NavLink to="/admin/groups" className={linkClasses}>
            <UserGroupIcon className="h-5 w-5 mr-3" />
            <span>Группы</span>
          </NavLink>
          <NavLink to="/admin/schedule" className={linkClasses}>
            <CalendarDaysIcon className="h-5 w-5 mr-3" />
            <span>Расписание</span>
          </NavLink>
          <NavLink to="/admin/students" className={linkClasses}>
            <UserCircleIcon className="h-5 w-5 mr-3" />
            <span>Ученики</span>
          </NavLink>
          <NavLink to="/admin/contracts" className={linkClasses}>
            <DocumentTextIcon className="h-5 w-5 mr-3" />
            <span>Контракты</span>
          </NavLink>
          <NavLink to="/admin/payments" className={linkClasses}>
            <CreditCardIcon className="h-5 w-5 mr-3" />
            <span>Платежи</span>
          </NavLink>
        </nav>

        <nav className="border-t border-slate-100 p-3">
          <NavLink to="/admin/profile" className={linkClasses}>
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

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
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
                  {branchLabel ?? "Филиал не выбран"}
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
              <Button variant="secondary" size="sm" onClick={() => navigate("/admin/profile")}>
                <UserCircleIcon className="h-4 w-4" />
                Профиль
              </Button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
