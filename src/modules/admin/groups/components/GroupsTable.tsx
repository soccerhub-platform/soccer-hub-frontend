import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRightIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { GroupOverviewItem } from "../group.api";

interface Props {
  groups: GroupOverviewItem[];
}

const GroupsTable: React.FC<Props> = ({ groups }) => {
  const navigate = useNavigate();

  if (groups.length === 0) {
    return (
      <div className="bg-white p-4 rounded-xl border text-sm text-gray-500">
        Группы не найдены
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-5 py-3 text-left">Группа</th>
            <th className="px-5 py-3 text-left">Возраст</th>
            <th className="px-5 py-3 text-left">Уровень</th>
            <th className="px-5 py-3 text-left">Состав</th>
            <th className="px-5 py-3 text-left">Статус</th>
            <th className="px-5 py-3 text-left">Состояние</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {groups.map((g) => (
            <tr
              key={g.groupId}
              onClick={() => navigate(`/admin/groups/${g.groupId}`)}
              className="hover:bg-admin-100 cursor-pointer transition"
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-admin-100 flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-admin-700" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{g.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {g.audienceType === "ADULT" ? "Взрослая группа" : "Детская группа"}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-5 py-4 text-sm text-gray-700">
                {g.audienceType === "ADULT" ? "Без детского диапазона" : `${g.ageFrom}–${g.ageTo}`}
              </td>

              <td className="px-5 py-4 text-sm text-gray-700">
                {humanizeLevel(g.level)}
              </td>

              <td className="px-5 py-4 text-sm text-gray-700">
                {g.studentsCount}/{g.capacity}
              </td>

              <td className="px-5 py-4">
                <StatusBadge status={g.status} />
              </td>

              <td className="px-5 py-4">
                <HealthBadge health={g.health} />
              </td>

              <td className="px-5 py-4 text-right">
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function humanizeLevel(level: string) {
  const map: Record<string, string> = {
    BEGINNER: "Начальный",
    INTERMEDIATE: "Средний",
    ADVANCED: "Продвинутый",
  };

  return map[level] ?? level;
}

const StatusBadge = ({ status }: { status: GroupOverviewItem["status"] }) => {
  const map = {
    ACTIVE: { label: "Активна", cls: "bg-green-100 text-green-700" },
    PAUSED: { label: "На паузе", cls: "bg-yellow-100 text-yellow-700" },
    STOPPED: { label: "Остановлена", cls: "bg-red-100 text-red-700" },
  };

  const cfg = map[status];

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
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
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
};

export default GroupsTable;
