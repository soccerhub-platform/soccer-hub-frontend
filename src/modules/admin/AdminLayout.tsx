import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, ClipboardCheck, CreditCard, FileText, GraduationCap, House, LayoutDashboard, LogOut, Menu, User, Users } from "lucide-react";
import { useAuth } from "../../shared/AuthContext";
import BrandMark from "../../shared/ui/BrandMark";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, ModalShell } from "../../shared/ui";
import { useAdminBranch } from "./BranchContext";

const SIDEBAR_COLLAPSED_KEY = "admin.sidebar.collapsed";

type AdminNavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  end?: boolean;
};

const MAIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/admin/dashboard", label: "Главная", icon: House, end: true },
  { to: "/admin/leads", label: "Лиды", icon: LayoutDashboard },
  { to: "/admin/trials", label: "Пробные", icon: ClipboardCheck },
  { to: "/admin/clients", label: "Клиенты", icon: User },
  { to: "/admin/students", label: "Ученики", icon: GraduationCap },
  { to: "/admin/coaches", label: "Тренеры", icon: CircleUserRound },
  { to: "/admin/groups", label: "Группы", icon: Users },
  { to: "/admin/schedule", label: "Занятия", icon: CalendarDays },
  { to: "/admin/contracts", label: "Договоры", icon: FileText },
  { to: "/admin/payments", label: "Платежи", icon: CreditCard },
];

const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { branchName } = useAdminBranch();
  const branchLabel = branchName === "Main Branch" ? "Главный филиал" : branchName;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      // The sidebar still works for the current session when storage is unavailable.
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
    `group relative mx-3 flex items-center rounded-lg text-[13px] font-medium transition-colors duration-150 ${
      sidebarCollapsed ? "justify-center px-0 py-3" : "gap-2.5 px-3 py-2"
    } ${
      isActive
        ? "bg-blue-50 text-[#0066cc]"
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
        aria-label={item.label}
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`h-[18px] w-[18px] shrink-0 ${
                isActive ? "text-[#0066cc]" : "text-slate-400 group-hover:text-[#0066cc]"
              }`}
            />
            {!sidebarCollapsed ? <span className="min-w-0 truncate">{item.label}</span> : null}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="admin-flat-ui flex h-[100dvh] overflow-hidden app-bg-admin">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:p-3">Перейти к содержимому</a>
      <aside
        className={`sticky top-0 hidden h-[100dvh] shrink-0 flex-col border-r border-black/[0.08] bg-[#f8f9fb] transition-[width] duration-300 md:flex ${
          sidebarCollapsed ? "w-[68px]" : "w-[216px]"
        }`}
      >
        <div className={`${sidebarCollapsed ? "px-3" : "px-4"} pb-5 pt-6`}>
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
            <div className={`flex min-w-0 items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <BrandMark compact />
              {!sidebarCollapsed ? (
                <div className="min-w-0">
                  <div className="heading-font truncate text-[15px] font-semibold tracking-tight text-slate-950">
                    Soccer Hub
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
              className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-white text-slate-500 transition hover:border-blue-200 hover:text-[#0066cc] md:flex ${
                collapsed ? "absolute left-[58px] top-6 z-20" : ""
              }`}
              aria-label={collapsed ? "Открыть меню" : "Свернуть меню"}
              title={collapsed ? "Открыть меню" : "Свернуть меню"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav aria-label="Разделы администратора" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-4">
          {!sidebarCollapsed ? (
            <div className="mb-3 px-6 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Рабочее пространство</div>
          ) : null}
          {MAIN_NAV_ITEMS.map((item, i) => <React.Fragment key={item.to}>{!sidebarCollapsed && (i === 4 || i === 8) && <div className="px-6 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{i === 4 ? "Клуб и занятия" : "Финансы"}</div>}{renderNavItem(item)}</React.Fragment>)}
        </nav>

        <div className="px-3 pb-4 pt-2">
          <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={sidebarCollapsed ? "Профиль" : undefined}
                aria-label="Меню профиля"
                className={`flex w-full items-center rounded-2xl border border-black/[0.08] bg-transparent px-3 py-3 text-left transition hover:border-slate-300 hover:bg-white ${
                  profileMenuOpen ? "border-slate-300 bg-slate-50" : ""
                } ${sidebarCollapsed ? "justify-center px-0" : "gap-3"}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-sm font-semibold text-white">{(user?.email?.[0] ?? "A").toUpperCase()}</div>
                {!sidebarCollapsed ? <div className="min-w-0 flex-1"><div className="truncate ui-section-title">Администратор</div><div className="truncate text-xs text-slate-500">{branchLabel ?? "Филиал не выбран"}</div></div> : null}
                {!sidebarCollapsed ? <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 transition ${profileMenuOpen ? "rotate-90" : ""}`} /> : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
              <DropdownMenuGroup><DropdownMenuItem onSelect={() => navigate("/admin/profile")}><User />Профиль</DropdownMenuItem></DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup><DropdownMenuItem onSelect={handleLogout} className="text-rose-700 focus:text-rose-700"><LogOut />Выйти</DropdownMenuItem></DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden"><button aria-label="Открыть разделы" onClick={() => setMobileMenuOpen(true)} className="rounded-lg p-2 text-slate-600"><Menu className="h-5 w-5"/></button><span className="text-sm font-semibold">Soccer Hub</span><span className="ml-auto max-w-[130px] truncate text-xs text-slate-500">{branchLabel}</span></header>
        <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-3 text-[0.95rem] sm:p-6">
          <Outlet />
        </main>
      </div>
      {mobileMenuOpen && <ModalShell title="Разделы" description={branchLabel || "Рабочее пространство"} placement="right" maxWidthClassName="max-w-sm" onClose={() => setMobileMenuOpen(false)}>
        <nav aria-label="Мобильное меню" className="grid gap-1">{MAIN_NAV_ITEMS.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className={({isActive}) => `flex items-center gap-3 rounded-lg p-3 text-sm ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}><item.icon className="h-4 w-4"/>{item.label}</NavLink>)}
          <NavLink to="/admin/profile" className="rounded-lg p-3 text-sm text-slate-700" onClick={() => setMobileMenuOpen(false)}>Профиль</NavLink>
          <button onClick={handleLogout} className="rounded-lg p-3 text-left text-sm text-rose-700">Выйти</button>
        </nav>
      </ModalShell>}
    </div>
  );
};

export default AdminLayout;
