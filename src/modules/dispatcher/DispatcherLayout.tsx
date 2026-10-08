import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight, CircleUserRound, House, LayoutDashboard, LogOut, Menu, Users } from "lucide-react";
import { useAuth } from "../../shared/AuthContext";
import BrandMark from "../../shared/ui/BrandMark";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, ModalShell } from "../../shared/ui";
import { cn } from "../../shared/ui/utils";

const NAV_ITEMS = [
  { to: "/dispatcher/dashboard", label: "Главная", icon: House },
  { to: "/dispatcher/leads", label: "Лиды", icon: LayoutDashboard },
  { to: "/dispatcher/clubs", label: "Клубы и филиалы", icon: Building2 },
  { to: "/dispatcher/admins", label: "Администраторы", icon: Users },
];
const COLLAPSED_KEY = "dispatcher.sidebar.collapsed";

const DispatcherLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === "true"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch { /* Session state remains usable. */ }
  }, [collapsed]);
  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="flex h-[100dvh] overflow-hidden app-bg-admin">
      <a href="#dispatcher-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-background focus:p-3">Перейти к содержимому</a>
      <aside className={cn("relative hidden shrink-0 flex-col border-r border-border bg-muted/30 transition-[width] md:flex", collapsed ? "w-[68px]" : "w-[216px]")}>
        <div className={cn("flex items-center py-6", collapsed ? "justify-center px-3" : "gap-3 px-4")}>
          <BrandMark compact />
          {!collapsed && <span className="heading-font text-[15px] font-semibold text-foreground">Soccer Hub</span>}
          <Button variant="secondary" size="sm" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Открыть меню" : "Свернуть меню"} className={cn("shrink-0 px-2", collapsed ? "absolute left-[58px] top-6" : "ml-auto")}>
            {collapsed ? <ChevronRight data-icon="inline-start" /> : <ChevronLeft data-icon="inline-start" />}
          </Button>
        </div>
        <nav aria-label="Разделы диспетчера" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-4">
          {!collapsed && <div className="px-6 pb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Рабочее пространство</div>}
          {NAV_ITEMS.map(({to, label, icon: Icon}) => <NavLink key={to} to={to} title={collapsed ? label : undefined} aria-label={label} className={({isActive}) => cn("mx-3 flex items-center rounded-lg text-[13px] font-medium transition-colors", collapsed ? "justify-center py-3" : "gap-2.5 px-3 py-2", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-[18px] shrink-0" />{!collapsed && <span className="truncate">{label}</span>}</NavLink>)}
        </nav>
        <div className="px-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Меню профиля" className={cn("flex w-full items-center rounded-xl border border-border py-3 text-left hover:bg-background", collapsed ? "justify-center" : "gap-3 px-3")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{(user?.email?.[0] || "D").toUpperCase()}</span>
                {!collapsed && <span className="min-w-0"><span className="block text-sm font-semibold text-foreground">Диспетчер</span><span className="block truncate text-xs text-muted-foreground">{user?.email}</span></span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuGroup><DropdownMenuItem onSelect={() => navigate("/dispatcher/profile")}><CircleUserRound />Профиль</DropdownMenuItem></DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup><DropdownMenuItem onSelect={handleLogout}><LogOut />Выйти</DropdownMenuItem></DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
          <Button variant="ghost" size="sm" aria-label="Открыть разделы" onClick={() => setMobileMenuOpen(true)}><Menu data-icon="inline-start" /></Button>
          <span className="text-sm font-semibold">Soccer Hub</span><span className="ml-auto text-xs text-muted-foreground">Диспетчер</span>
        </header>
        <main id="dispatcher-main" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6"><Outlet /></main>
      </div>
      {mobileMenuOpen && <ModalShell title="Разделы" description="Рабочее пространство диспетчера" placement="right" maxWidthClassName="max-w-sm" onClose={() => setMobileMenuOpen(false)}>
        <nav aria-label="Мобильное меню" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({to,label,icon: Icon}) => <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)} className={({isActive}) => cn("flex items-center gap-3 rounded-lg p-3 text-sm",isActive ? "bg-primary/10 text-primary" : "text-muted-foreground")}><Icon className="size-4" />{label}</NavLink>)}
          <NavLink to="/dispatcher/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg p-3 text-sm"><CircleUserRound className="size-4" />Профиль</NavLink>
          <Button variant="ghost" onClick={handleLogout}><LogOut data-icon="inline-start" />Выйти</Button>
        </nav>
      </ModalShell>}
    </div>
  );
};
export default DispatcherLayout;
