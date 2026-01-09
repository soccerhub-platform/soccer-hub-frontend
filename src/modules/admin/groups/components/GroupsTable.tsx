import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Group, GroupFiltersValue } from "../types";

/* ================= MOCK DATA ================= */

const MOCK_GROUPS: Group[] = [
  {
    id: "1",
    name: "U10 Tigers",
    branch: "Главный филиал",
    ageRange: "8–10",
    level: "Начальный",
    coachesCount: 1,
    scheduleDays: ["Пн", "Ср", "Пт"],
    status: "ACTIVE",
  },
  {
    id: "2",
    name: "U12 Lions",
    branch: "Западный филиал",
    ageRange: "10–12",
    level: "Средний",
    coachesCount: 2,
    scheduleDays: ["Вт", "Чт"],
    status: "PAUSED",
  },
];

/* ================= PROPS ================= */

interface Props {
  filters: GroupFiltersValue;
}

/* ================= COMPONENT ================= */

const GroupsTable: React.FC<Props> = ({ filters }) => {
  const navigate = useNavigate();

  const filteredGroups = useMemo(() => {
    return MOCK_GROUPS.filter((g) => {
      if (
        filters.search &&
        !g.name.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      if (filters.branchId && g.branch !== filters.branchId) {
        return false;
      }

      if (filters.status && g.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [filters]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-5 py-3 text-left">Группа</th>
            <th className="px-5 py-3 text-left">Филиал</th>
            <th className="px-5 py-3 text-left">Возраст</th>
            <th className="px-5 py-3 text-left">Уровень</th>
            <th className="px-5 py-3 text-left">Тренеры</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {filteredGroups.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-6 text-center text-sm text-gray-500"
              >
                Группы не найдены
              </td>
            </tr>
          ) : (
            filteredGroups.map((g) => (
              <tr
                key={g.id}
                className="hover:bg-admin-100 transition cursor-pointer"
                onClick={() => navigate(`/admin/groups/${g.id}`)}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-admin-100 flex items-center justify-center">
                      <UserGroupIcon className="h-5 w-5 text-admin-700" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {g.name}
                      </div>
                      <StatusBadge status={g.status} />
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {g.branch}
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {g.ageRange}
                </td>

                <td className="px-5 py-4">
                  <LevelBadge level={g.level} />
                </td>

                <td className="px-5 py-4 text-sm text-gray-700">
                  {g.coachesCount}
                </td>

                <td className="px-5 py-4 text-right">
                  <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GroupsTable;

/* ================= BADGES ================= */

const StatusBadge = ({ status }: { status: Group["status"] }) => {
  const map = {
    ACTIVE: { label: "Активна", cls: "bg-green-100 text-green-700" },
    PAUSED: { label: "На паузе", cls: "bg-yellow-100 text-yellow-700" },
    STOPPED: { label: "Остановлена", cls: "bg-red-100 text-red-700" },
  };

  return (
    <span
      className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${map[status].cls}`}
    >
      {map[status].label}
    </span>
  );
};

const LevelBadge = ({ level }: { level: string }) => {
  const map: Record<string, string> = {
    Начальный: "bg-blue-100 text-blue-700",
    Средний: "bg-purple-100 text-purple-700",
    Продвинутый: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[level] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {level}
    </span>
  );
};