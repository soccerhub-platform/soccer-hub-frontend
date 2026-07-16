import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  Bars3BottomLeftIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DocumentTextIcon,
  HomeIcon,
  Squares2X2Icon,
  UserIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../shared/AuthContext";
import BrandMark from "../../shared/ui/BrandMark";
import { useAdminBranch } from "./BranchContext";

const SIDEBAR_COLLAPSED_KEY = "admin.sidebar.collapsed";

type AdminNavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  end?: boolean;
};

const MAIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/admin/dashboard", label: "Главная", icon: HomeIcon, end: true },
  { to: "/admin/leads", label: "Лиды", icon: Squares2X2Icon },
  { to: "/admin/coaches", label: "Тренеры", icon: UserCircleIcon },
  { to: "/admin/groups", label: "Группы", icon: UserGroupIcon },
  { to: "/admin/schedule", label: "Расписание", icon: CalendarDaysIcon },
  { to: "/admin/students", label: "Ученики", icon: UserCircleIcon },
  { to: "/admin/contracts", label: "Контракты", icon: DocumentTextIcon },
  { to: "/admin/payments", label: "Платежи", icon: CreditCardIcon },
];

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { branchName } = useAdminBranch();
  const branchLabel = branchName === "Main Branch" ? "Главный филиал" : branchName;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Keep the current session state even when storage is unavailable.
    }
  }, [collapsed]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompactViewport(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const sidebarCollapsed = collapsed || compactViewport;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `group relative mx-2 flex items-center rounded-xl text-sm font-semibold transition-all duration-200 ${
      sidebarCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"
    } ${
      isActive
        ? "bg-cyan-50 text-cyan-900"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    }`;

  const renderNavItem = (item: AdminNavItem) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={navLinkClasses}
        end={item.end}
        title={sidebarCollapsed ? item.label : undefined}
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`h-5 w-5 shrink-0 ${
                isActive ? "text-cyan-700" : "text-slate-400 group-hover:text-cyan-700"
              }`}
            />
            {!sidebarCollapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden app-bg-admin">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white/92 shadow-sm backdrop-blur transition-[width] duration-300 ${
          sidebarCollapsed ? "w-[72px]" : "w-[260px]"
        }`}
      >
        <div className={`${sidebarCollapsed ? "px-3" : "px-5"} pb-4 pt-5`}>
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
            <div className={`flex min-w-0 items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <BrandMark compact />
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <div className="heading-font truncate text-lg font-semibold tracking-tight text-slate-950">
                    FootballCRM
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setCollapsed((value) => !value);
                setProfileMenuOpen(false);
              }}
              className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700 md:flex ${
                collapsed ? "absolute left-[54px] top-5" : ""
              }`}
              aria-label={collapsed ? "Открыть меню" : "Свернуть меню"}
              title={collapsed ? "Открыть меню" : "Свернуть меню"}
            >
              {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
            </button>
          </div>

        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-4">
          {!sidebarCollapsed ? (
            <div className="mb-2 px-5 text-[11px] font-semibold uppercase text-slate-300">Меню</div>
          ) : (
            <div className="mb-2 flex justify-center text-slate-300">
              <Bars3BottomLeftIcon className="h-4 w-4" />
            </div>
          )}
          {MAIN_NAV_ITEMS.map(renderNavItem)}
        </nav>

        <nav className="relative mt-auto border-t border-slate-100 bg-white/95 p-3">
          {profileMenuOpen ? (
            <div
              className={`absolute bottom-[74px] z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 ${
                sidebarCollapsed ? "left-3 w-56" : "left-3 right-3"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate("/admin/profile");
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                Профиль
              </button>
              <div className="mx-3 my-1 border-t border-slate-100" />
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <div className="truncate font-semibold text-slate-700">Администратор</div>
                <div className="mt-0.5 truncate">{user?.email ?? "Пользователь"}</div>
                <div className="mt-1 truncate text-slate-400">{branchLabel ?? "Филиал не выбран"}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                Выйти
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setProfileMenuOpen((value) => !value)}
            title={sidebarCollapsed ? "Профиль" : undefined}
            className={`flex w-full items-center rounded-2xl text-left transition ${
              sidebarCollapsed ? "justify-center px-0 py-2" : "gap-3 px-1 py-2"
            } ${profileMenuOpen ? "bg-slate-50" : "hover:bg-slate-50"}`}
            aria-expanded={profileMenuOpen}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-sm font-semibold text-white">
              {(user?.email?.[0] ?? "A").toUpperCase()}
            </div>
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">Администратор</div>
                <div className="truncate text-xs text-slate-500">{branchLabel ?? "Филиал не выбран"}</div>
              </div>
            ) : null}
            {!sidebarCollapsed ? (
              <ChevronRightIcon
                className={`h-4 w-4 shrink-0 text-slate-400 transition ${profileMenuOpen ? "-rotate-90" : ""}`}
              />
            ) : null}
          </button>
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-y-auto p-3 text-[0.95rem] sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
