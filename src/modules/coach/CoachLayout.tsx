import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  ClockIcon,
  HomeIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../shared/AuthContext";
import BrandMark from "../../shared/ui/BrandMark";

const CoachLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-medium sm:text-sm ${
      isActive ? "bg-teal-950 text-white shadow-sm" : "text-teal-900 hover:bg-teal-50"
    }`;

  return (
    <div className="min-h-screen bg-[#eef5f1]">
      <header className="sticky top-0 z-10 border-b border-teal-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div>
              <div className="heading-font text-sm font-semibold text-teal-950">Club Hub</div>
              <div className="text-xs text-teal-800/65">{user?.email ?? "Тренер"}</div>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-teal-100 px-3 py-2 text-xs font-medium text-teal-900 hover:bg-teal-50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-5">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-teal-100 bg-white/95 px-3 py-2 backdrop-blur">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-4 gap-2">
          <NavLink to="/coach/today" className={linkClass}>
            <HomeIcon className="h-4 w-4" />
            Сегодня
          </NavLink>
          <NavLink to="/coach/schedule" className={linkClass}>
            <CalendarDaysIcon className="h-4 w-4" />
            Расписание
          </NavLink>
          <NavLink to="/coach/history" className={linkClass}>
            <ClockIcon className="h-4 w-4" />
            История
          </NavLink>
          <NavLink to="/coach/profile" className={linkClass}>
            <UserCircleIcon className="h-4 w-4" />
            Профиль
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default CoachLayout;
