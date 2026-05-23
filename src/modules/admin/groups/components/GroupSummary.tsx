import React from "react";
import {
  UserGroupIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface Props {
  coachesCount: number;
  sessionsPerWeek: number;
  nextSession?: string | null;
  studentsCount: number;
  capacity: number;
  scheduleActive: boolean;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  const d = new Date(value);
  return d.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const GroupSummary: React.FC<Props> = ({
  coachesCount,
  sessionsPerWeek,
  nextSession,
  studentsCount,
  capacity,
  scheduleActive,
}) => {
  const progress =
    capacity > 0 ? Math.round((studentsCount / capacity) * 100) : 0;

  const Item = ({
    icon: Icon,
    label,
    value,
    hint,
    highlight,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    hint?: string;
    highlight?: boolean;
  }) => (
    <div
      className={`
        rounded-2xl border bg-white p-4 shadow-sm
        ${highlight ? "border-cyan-200" : "border-slate-200"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50">
          <Icon className="h-5 w-5 text-cyan-800" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="truncate text-sm font-semibold text-slate-900">
            {value}
          </div>
          {hint && (
            <div className="mt-0.5 text-[11px] text-slate-400">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Item
        icon={UsersIcon}
        label="Тренеры"
        value={coachesCount}
      />

      <Item
        icon={CalendarDaysIcon}
        label="Занятий в неделю"
        value={sessionsPerWeek}
        hint={scheduleActive ? "расписание активно" : "расписание выключено"}
      />

      <Item
        icon={ClockIcon}
        label="Ближайшая тренировка"
        value={formatDateTime(nextSession)}
      />

      <Item
        icon={UserGroupIcon}
        label="Участники"
        value={`${studentsCount} / ${capacity}`}
        hint={`${progress}% заполнено`}
      />
    </div>
  );
};

export default GroupSummary;
