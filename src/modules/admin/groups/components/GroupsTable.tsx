import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { GroupOverviewItem } from "../group.api";
import GroupAvatar from "./GroupAvatar";

interface Props {
  groups: GroupOverviewItem[];
}

const GroupsTable: React.FC<Props> = ({ groups }) => {
  const navigate = useNavigate();

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        Группы не найдены
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_-25px_rgba(15,23,42,0.45)]">
      <div className="hidden grid-cols-[minmax(260px,1.35fr)_170px_130px_190px_170px_44px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
        <ColumnTitle icon={<UserGroupIcon className="h-3.5 w-3.5" />} label="Группа" />
        <ColumnTitle icon={<UsersIcon className="h-3.5 w-3.5" />} label="Состав" />
        <ColumnTitle icon={<UserGroupIcon className="h-3.5 w-3.5" />} label="Тренеры" />
        <ColumnTitle icon={<CalendarDaysIcon className="h-3.5 w-3.5" />} label="Следующее занятие" />
        <ColumnTitle icon={<ShieldCheckIcon className="h-3.5 w-3.5" />} label="Состояние" />
        <div />
      </div>

      <div className="divide-y divide-slate-100">
        {groups.map((group) => (
          <GroupRow
            key={group.groupId}
            group={group}
            onOpen={() => navigate(`/admin/groups/${group.groupId}/overview`)}
            onOpenStudents={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/students`);
            }}
            onOpenCoaches={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/coaches`);
            }}
            onOpenSchedule={(event) => {
              event.stopPropagation();
              navigate(`/admin/groups/${group.groupId}/schedule`);
            }}
          />
        ))}
      </div>
    </section>
  );
};

const GroupRow: React.FC<{
  group: GroupOverviewItem;
  onOpen: () => void;
  onOpenStudents: React.MouseEventHandler<HTMLButtonElement>;
  onOpenCoaches: React.MouseEventHandler<HTMLButtonElement>;
  onOpenSchedule: React.MouseEventHandler<HTMLButtonElement>;
}> = ({ group, onOpen, onOpenStudents, onOpenCoaches, onOpenSchedule }) => {
  const capacityPercent =
    group.capacity > 0
      ? Math.round((group.studentsCount / group.capacity) * 100)
      : 0;
  const progressWidth = Math.min(100, capacityPercent);
  const isRisky = group.health !== "OK";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group grid cursor-pointer grid-cols-1 gap-3 px-4 py-4 transition hover:bg-cyan-50/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-200 lg:grid-cols-[minmax(260px,1.35fr)_170px_130px_190px_170px_44px] lg:items-center lg:gap-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <GroupAvatar name={group.name} avatar={group.avatar} />
          {isRisky ? (
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-100 text-amber-700">
              <ExclamationTriangleIcon className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">{group.name}</h3>
            <StatusBadge status={group.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{formatAudience(group)}</span>
            <span>{humanizeLevel(group.level)}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenStudents}
        className="text-left transition hover:text-cyan-800 lg:block"
      >
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <UsersIcon className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Состав</span>
        </div>
        <div className="flex items-baseline justify-between gap-2 lg:block">
          <span className="text-sm font-semibold text-slate-950">
            {group.studentsCount} / {group.capacity}
          </span>
          <span className="text-xs text-slate-500 lg:ml-1">учеников</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full ${capacityPercent > 100 ? "bg-rose-500" : "bg-cyan-700"}`}
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenCoaches}
        className="flex items-center justify-between gap-3 text-left transition hover:text-cyan-800 lg:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <UserGroupIcon className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Тренеры</span>
        </div>
        <div className="text-sm font-semibold text-slate-950">{formatCoaches(group.coachesCount)}</div>
      </button>

      <button
        type="button"
        onClick={onOpenSchedule}
        className="flex items-start justify-between gap-3 text-left transition hover:text-cyan-800 lg:block"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
            <CalendarDaysIcon className="h-4 w-4" />
          </span>
          <span className="lg:hidden">Следующее</span>
        </div>
        <div className="text-sm font-semibold text-slate-950">{formatNextSession(group.nextSessionAt)}</div>
      </button>

      <HealthBadge health={group.health} />

      <div className="hidden justify-end lg:flex">
        <ArrowRightIcon className="h-5 w-5 text-slate-400 transition group-hover:text-cyan-700" />
      </div>
    </div>
  );
};

const ColumnTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-400">{icon}</span>
    <span>{label}</span>
  </div>
);

function formatAudience(group: GroupOverviewItem) {
  if (group.audienceType === "ADULT") return "Взрослая группа";
  if (typeof group.ageFrom === "number" && typeof group.ageTo === "number") {
    return `${group.ageFrom}-${group.ageTo} лет`;
  }
  return "Возраст не указан";
}

function formatNextSession(value: string | null) {
  if (!value) return "Не запланировано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCoaches(value: number) {
  if (value === 1) return "1 тренер";
  if (value > 1 && value < 5) return `${value} тренера`;
  return `${value} тренеров`;
}

function humanizeLevel(level: string) {
  const map: Record<string, string> = {
    BEGINNER: "Начальный",
    INTERMEDIATE: "Средний",
    ADVANCED: "Продвинутый",
    PRO: "PRO",
  };

  return map[level] ?? level;
}

const StatusBadge = ({ status }: { status: GroupOverviewItem["status"] }) => {
  const map = {
    ACTIVE: { label: "Активна", cls: "border-emerald-100 bg-emerald-50 text-emerald-700" },
    PAUSED: { label: "На паузе", cls: "border-amber-100 bg-amber-50 text-amber-700" },
    STOPPED: { label: "Остановлена", cls: "border-rose-100 bg-rose-50 text-rose-700" },
  };

  const cfg = map[status];

  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
};

const HealthBadge = ({ health }: { health: GroupOverviewItem["health"] }) => {
  const map = {
    OK: {
      label: "Всё в порядке",
      icon: <CheckCircleIcon className="h-4 w-4" />,
      cls: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    NO_COACH: {
      label: "Нет тренера",
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-amber-100 bg-amber-50 text-amber-700",
    },
    NO_SCHEDULE: {
      label: "Нет расписания",
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-amber-100 bg-amber-50 text-amber-700",
    },
    OVER_CAPACITY: {
      label: "Переполнена",
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-rose-100 bg-rose-50 text-rose-700",
    },
    PAUSED: {
      label: "На паузе",
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-amber-100 bg-amber-50 text-amber-700",
    },
    STOPPED: {
      label: "Остановлена",
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-rose-100 bg-rose-50 text-rose-700",
    },
  } as const;
  const cfg =
    map[health] ??
    {
      label: health,
      icon: <ExclamationTriangleIcon className="h-4 w-4" />,
      cls: "border-slate-200 bg-slate-50 text-slate-600",
    };
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

export default GroupsTable;
