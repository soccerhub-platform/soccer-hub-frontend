import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { GroupOverviewItem } from "../group.api";

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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {groups.map((group) => {
        const capacityPercent =
          group.capacity > 0 ? Math.min(100, Math.round((group.studentsCount / group.capacity) * 100)) : 0;
        const isRisky = group.health !== "OK";

        return (
          <section
            key={group.groupId}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => navigate(`/admin/groups/${group.groupId}`)}
              className="w-full text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isRisky ? "bg-amber-50 text-amber-700" : "bg-cyan-50 text-cyan-800"
                    }`}
                  >
                    {isRisky ? (
                      <ExclamationTriangleIcon className="h-6 w-6" />
                    ) : (
                      <UserGroupIcon className="h-6 w-6" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-slate-950">{group.name}</h3>
                      <StatusBadge status={group.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{formatAudience(group)}</span>
                      <span>{humanizeLevel(group.level)}</span>
                    </div>
                  </div>
                </div>

                <ChevronRightIcon className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <MiniStat
                  icon={<UsersIcon className="h-4 w-4" />}
                  label="Состав"
                  value={`${group.studentsCount}/${group.capacity}`}
                />
                <MiniStat
                  icon={<UserGroupIcon className="h-4 w-4" />}
                  label="Тренеры"
                  value={String(group.coachesCount)}
                />
                <MiniStat
                  icon={<CalendarDaysIcon className="h-4 w-4" />}
                  label="Следующее"
                  value={formatNextSession(group.nextSessionAt)}
                />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Заполненность</span>
                  <span className="text-slate-500">{capacityPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${capacityPercent > 100 ? "bg-rose-500" : "bg-cyan-700"}`}
                    style={{ width: `${capacityPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <HealthBadge health={group.health} />
                <span className="text-xs font-medium text-cyan-800">Открыть группу</span>
              </div>
            </button>
          </section>
        );
      })}
    </div>
  );
};

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</div>
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
  if (!value) return "Нет";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
    ACTIVE: { label: "Активна", cls: "border border-emerald-100 bg-emerald-50 text-emerald-700" },
    PAUSED: { label: "На паузе", cls: "border border-amber-100 bg-amber-50 text-amber-700" },
    STOPPED: { label: "Остановлена", cls: "border border-rose-100 bg-rose-50 text-rose-700" },
  };

  const cfg = map[status];

  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
};

const HealthBadge = ({ health }: { health: GroupOverviewItem["health"] }) => {
  const map = {
    OK: { label: "OK", cls: "border border-emerald-100 bg-emerald-50 text-emerald-700" },
    NO_COACH: { label: "Нет тренера", cls: "border border-amber-100 bg-amber-50 text-amber-700" },
    NO_SCHEDULE: { label: "Нет расписания", cls: "border border-amber-100 bg-amber-50 text-amber-700" },
    OVER_CAPACITY: { label: "Переполнена", cls: "border border-rose-100 bg-rose-50 text-rose-700" },
    PAUSED: { label: "На паузе", cls: "border border-amber-100 bg-amber-50 text-amber-700" },
    STOPPED: { label: "Остановлена", cls: "border border-rose-100 bg-rose-50 text-rose-700" },
  } as const;
  const cfg = map[health] ?? { label: health, cls: "border border-slate-200 bg-slate-50 text-slate-600" };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
};

export default GroupsTable;
