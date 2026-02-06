import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../shared/AuthContext";
import {
  GroupApi,
  GroupApiModel,
  GroupSummaryModel,
} from "./group.api";
import GroupTabs from "./components/GroupTabs";
import GroupSummary from "./components/GroupSummary";
import toast from "react-hot-toast";

/* ================= STATUS BADGE ================= */

const StatusBadge = ({ status }: { status: GroupApiModel["status"] }) => {
  const map: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
    STOPPED: "bg-red-100 text-red-700",
  };

  const label =
    status === "ACTIVE"
      ? "Активна"
      : status === "PAUSED"
      ? "На паузе"
      : "Остановлена";

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status]}`}
    >
      {label}
    </span>
  );
};

/* ================= PAGE ================= */

const GroupDetailsPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [group, setGroup] = useState<GroupApiModel | null>(null);
  const [summary, setSummary] = useState<GroupSummaryModel | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  /* ================= LOAD ================= */

  useEffect(() => {
    if (!token) return;
    if (!groupId) return;

    setLoading(true);
    Promise.all([
      GroupApi.getById(groupId, token),
      GroupApi.getSummary(groupId, token),
    ])
      .then(([groupData, summaryData]) => {
        setGroup(groupData);
        setSummary(summaryData);
      })
      .finally(() => setLoading(false));
  }, [groupId, token]);

  /* ================= STATUS ================= */

  const changeStatus = async (
    status: "ACTIVE" | "PAUSED" | "STOPPED"
  ) => {
    if (!group) return;

    if (status === "STOPPED") {
      const ok = confirm(
        "Вы уверены, что хотите остановить группу? Расписание будет отменено."
      );
      if (!ok) return;
    }

    setUpdating(true);
    try {
      await GroupApi.updateStatus(group.groupId, status, token);
      setGroup({ ...group, status });
    } catch (e) {
      console.error(e);
      toast.error("Не удалось изменить статус группы");
    } finally {
      setUpdating(false);
    }
  };

  /* ================= UI ================= */

  if (!token) {
    return <div className="text-sm text-red-500">Нет авторизации</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border p-6 animate-pulse">
          <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-64 bg-gray-100 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-sm text-red-500">Группа не найдена</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BACK */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Назад к группам
      </button>

      {/* HEADER */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-admin-100 flex items-center justify-center">
            <UserGroupIcon className="h-6 w-6 text-admin-700" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-800">
                {group.name}
              </h1>
              <StatusBadge status={group.status} />
            </div>

            <div className="text-sm text-gray-500 mt-1">
              возраст {group.ageFrom}–{group.ageTo} · уровень{" "}
              {group.level}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-2">
            {group.status === "PAUSED" && (
              <button
                disabled={updating}
                onClick={() => changeStatus("ACTIVE")}
                className="px-3 py-1.5 text-sm rounded-xl border text-green-700 hover:bg-green-50"
              >
                Активировать
              </button>
            )}

            {group.status === "ACTIVE" && (
              <button
                disabled={updating}
                onClick={() => changeStatus("PAUSED")}
                className="px-3 py-1.5 text-sm rounded-xl border hover:bg-gray-50"
              >
                Пауза
              </button>
            )}

            {group.status !== "STOPPED" && (
              <button
                disabled={updating}
                onClick={() => changeStatus("STOPPED")}
                className="px-3 py-1.5 text-sm rounded-xl border text-red-600 hover:bg-red-50"
              >
                Остановить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      {summary && (
        <GroupSummary
          coachesCount={summary.coachesCount}
          sessionsPerWeek={summary.sessionPerWeek}
          nextSession={summary.nextSession}
          studentsCount={summary.studentsCount}
          capacity={summary.capacity}
          scheduleActive={summary.scheduleActive}
        />
      )}

      {/* TABS */}
      <GroupTabs groupId={group.groupId} />
    </div>
  );
};

export default GroupDetailsPage;
