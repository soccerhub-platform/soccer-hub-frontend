import React from "react";
import { useNavigate } from "react-router-dom";
import GroupTabs from "./components/GroupTabs";
import { Group } from "./types";
import { UserGroupIcon } from "@heroicons/react/24/outline";

/* ================= MOCK ================= */

const MOCK_GROUP: Group = {
  id: "1",
  name: "U10 Tigers",
  branch: "Главный филиал",
  ageRange: "8–10",
  level: "Начальный",
  status: "ACTIVE",
  coachesCount: 1,
  scheduleDays: ["Пн", "Ср", "Пт"],
};

/* ================= PAGE ================= */

const GroupDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const group = MOCK_GROUP;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Назад к группам
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border p-6 shadow-sm">
        <div className="flex items-start justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-admin-100 flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-admin-700" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800">
                  {group.name}
                </h1>
                <StatusBadge status={group.status} />
              </div>

              <div className="mt-1 text-sm text-gray-500">
                {group.branch} · возраст {group.ageRange} · уровень{" "}
                {group.level}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50">
              Пауза
            </button>
            <button className="px-3 py-1.5 text-sm rounded-lg border text-red-600 hover:bg-red-50">
              Остановить
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <GroupTabs group={group} />
    </div>
  );
};

export default GroupDetailsPage;

/* ================= UI ================= */

const StatusBadge = ({ status }: { status: Group["status"] }) => {
  const map = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    STOPPED: "bg-red-100 text-red-700",
  };

  const label = {
    ACTIVE: "Активна",
    PAUSED: "На паузе",
    STOPPED: "Остановлена",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}
    >
      {label[status]}
    </span>
  );
};