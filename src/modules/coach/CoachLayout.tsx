import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Home,
  LogOut,
  CircleUserRound,
} from "lucide-react";
import { useAuth } from "../../shared/AuthContext";
import BrandMark from "../../shared/ui/BrandMark";

const CoachLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium sm:text-sm ${
      isActive ? "bg-[#1d1d1f] text-white" : "text-slate-700 hover:bg-blue-50"
    }`;

  return (
    <div className="min-h-screen bg-[#eef5f1]">
      <header className="sticky top-0 z-10 border-b border-black/[0.12] bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div>
              <div className="heading-font ui-section-title">Club Hub</div>
              <div className="text-xs text-slate-500">{user?.email ?? "Тренер"}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-black/[0.12] px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-black/[0.12] bg-white/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-4 gap-2">
          <NavLink to="/coach/today" className={linkClass}>
            <Home className="h-4 w-4" />
            Сегодня
          </NavLink>
          <NavLink to="/coach/schedule" className={linkClass}>
            <CalendarDays className="h-4 w-4" />
            Расписание
          </NavLink>
          <NavLink to="/coach/history" className={linkClass}>
            <Clock3 className="h-4 w-4" />
            История
          </NavLink>
          <NavLink to="/coach/profile" className={linkClass}>
            <CircleUserRound className="h-4 w-4" />
            Профиль
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default CoachLayout;
