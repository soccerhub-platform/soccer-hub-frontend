import React, { useEffect, useState } from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  UserMinusIcon,
  ArrowPathIcon,
  UserPlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../shared/AuthContext";
import { GroupApi, GroupCoachApiModel } from "../group.api";
import AssignCoachModal from "./AssignCoachModal";
import { useAdminBranch } from "../../BranchContext";

interface Props {
  groupId: string;
  groupStatus?: "ACTIVE" | "PAUSED" | "STOPPED";
}

const ROLE_LABELS: Record<string, string> = {
  MAIN: "Главный тренер",
  ASSISTANT: "Ассистент",
};

const ROLE_STYLES: Record<string, string> = {
  MAIN: "bg-blue-100 text-blue-700",
  ASSISTANT: "bg-purple-100 text-purple-700",
};

const GroupCoachesTab: React.FC<Props> = ({ groupId, groupStatus }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [coaches, setCoaches] = useState<GroupCoachApiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  const actionsDisabled = groupStatus === "STOPPED";

  const loadCoaches = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await GroupApi.getCoaches(groupId, token);
      setCoaches(res.coaches);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, [groupId, token]);

  const removeCoach = async (groupCoachId: string) => {
    if (!token) return;
    if (!confirm("Убрать тренера из группы?")) return;

    setRemovingId(groupCoachId);
    try {
      await GroupApi.unassignCoach(groupCoachId, token);
      setCoaches((prev) =>
        prev.filter((c) => c.groupCoachId !== groupCoachId)
      );
    } finally {
      setRemovingId(null);
    }
  };

  const assignedCoachIds = coaches.map((c) => c.coachId);

  if (!token) {
    return <div className="text-sm text-red-500">Нет авторизации</div>;
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm font-semibold">Тренеры группы</div>
          <div className="text-xs text-gray-500">
            Назначенные тренеры и их роли
          </div>
        </div>

        <button
          onClick={loadCoaches}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading && "animate-spin"}`} />
          Обновить
        </button>
      </div>

      {/* LIST */}
      {coaches.map((coach) => (
        <div
          key={coach.groupCoachId}
          className="flex justify-between items-center border rounded-xl px-4 py-3"
        >
          <div className="flex gap-3">
            <UserCircleIcon className="h-10 w-10 text-gray-300" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {coach.coachFirstName} {coach.coachLastName}
                </span>

                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${ROLE_STYLES[coach.coachRole]}`}
                >
                  {ROLE_LABELS[coach.coachRole]}
                </span>
              </div>

              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div className="flex items-center gap-1">
                  <EnvelopeIcon className="h-4 w-4" />
                  {coach.email}
                </div>
                <div className="flex items-center gap-1">
                  <PhoneIcon className="h-4 w-4" />
                  {coach.phone}
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={actionsDisabled || removingId === coach.groupCoachId}
            onClick={() => removeCoach(coach.groupCoachId)}
            className="text-red-500 disabled:opacity-50"
          >
            <UserMinusIcon className="h-5 w-5" />
          </button>
        </div>
      ))}

      {/* ASSIGN */}
      <button
        disabled={actionsDisabled || !branchId}
        onClick={() => setShowAssign(true)}
        className="w-full py-2 border border-dashed rounded-xl text-sm"
      >
        <UserPlusIcon className="h-4 w-4 inline mr-1" />
        Назначить тренера
      </button>

      {showAssign && branchId && (
        <AssignCoachModal
          groupId={groupId}
          branchId={branchId}
          assignedCoachIds={assignedCoachIds}
          onClose={() => setShowAssign(false)}
          onAssigned={loadCoaches}
        />
      )}
    </div>
  );
};

export default GroupCoachesTab;
