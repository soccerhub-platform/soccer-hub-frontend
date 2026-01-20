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
    icon: any;
    label: string;
    value: string | number;
    hint?: string;
    highlight?: boolean;
  }) => (
    <div
      className={`
        rounded-2xl p-4 border
        ${highlight ? "bg-admin-50 border-admin-200" : "bg-gray-50"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-admin-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-admin-700" />
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="font-semibold text-gray-800 text-sm">
            {value}
          </div>
          {hint && (
            <div className="text-[11px] text-gray-400 mt-0.5">
              {hint}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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