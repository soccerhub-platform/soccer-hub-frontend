import React, { useEffect, useState } from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  UserMinusIcon,
  ArrowPathIcon,
  UserPlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../../shared/AuthContext";
import { GroupApi, GroupCoachApiModel } from "../group.api";
import AssignCoachModal from "./AssignCoachModal";
import { useAdminBranch } from "../../BranchContext";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../shared/ui";

interface Props {
  groupId: string;
  branchId?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  MAIN: "Главный тренер",
  ASSISTANT: "Ассистент",
};

const ROLE_STYLES: Record<string, string> = {
  MAIN: "border-cyan-100 bg-cyan-50 text-cyan-800",
  ASSISTANT: "border-slate-200 bg-slate-50 text-slate-600",
};

const GroupCoachesTab: React.FC<Props> = ({ groupId, branchId: branchIdProp }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId: branchIdFromContext } = useAdminBranch();
  const branchId = branchIdProp ?? branchIdFromContext;

  const [coaches, setCoaches] = useState<GroupCoachApiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const preferredRole = searchParams.get("action") === "assign-main" ? "MAIN" : "ASSISTANT";
  const lockRole = searchParams.get("action") === "assign-main";

  const loadCoaches = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await GroupApi.getCoaches(groupId, token);
      setCoaches(res.coaches);
    } catch (e) {
      console.error("Failed to load group coaches", e);
      setError("Не удалось загрузить тренеров группы");
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoaches();
  }, [groupId, token]);

  useEffect(() => {
    if (!branchId) return;
    if (searchParams.get("tab") !== "coaches") return;
    if (searchParams.get("action") !== "assign-main") return;
    setShowAssign(true);
  }, [branchId, searchParams]);

  const closeAssignModal = () => {
    setShowAssign(false);
    if (searchParams.get("action")) {
      const next = new URLSearchParams(searchParams);
      next.delete("action");
      setSearchParams(next, { replace: true });
    }
  };

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
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Тренеры группы</div>
          <div className="text-xs text-slate-500">
            Назначенные тренеры и их роли
          </div>
        </div>

        <Button type="button" size="sm" variant="secondary" onClick={loadCoaches} disabled={loading}>
          <ArrowPathIcon className={`h-4 w-4 ${loading && "animate-spin"}`} />
          Обновить
        </Button>
      </div>

      {/* LIST */}
      {error ? (
        <ErrorState message={error} onRetry={loadCoaches} />
      ) : loading ? (
        <LoadingState label="Загрузка тренеров..." />
      ) : coaches.length === 0 ? (
        <EmptyState
          title="Тренеры не назначены"
          description="Назначьте главного тренера, чтобы можно было вести расписание и занятия."
        />
      ) : (
        <div className="space-y-3">
          {coaches.map((coach) => (
            <div
              key={coach.groupCoachId}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex gap-3">
                <UserCircleIcon className="h-10 w-10 text-slate-300" />

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {coach.coachFirstName} {coach.coachLastName}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${ROLE_STYLES[coach.coachRole]}`}
                    >
                      {ROLE_LABELS[coach.coachRole]}
                    </span>
                  </div>

                  <div className="mt-1 space-y-1 text-xs text-slate-500">
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

              <Button
                type="button"
                size="sm"
                variant="softDanger"
                isLoading={removingId === coach.groupCoachId}
                onClick={() => removeCoach(coach.groupCoachId)}
              >
                <UserMinusIcon className="h-4 w-4" />
                Убрать
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ASSIGN */}
      <Button
        type="button"
        variant="secondary"
        disabled={!branchId}
        onClick={() => setShowAssign(true)}
        className="w-full justify-center border-dashed"
      >
        <UserPlusIcon className="h-4 w-4" />
        Назначить тренера
      </Button>

      {showAssign && branchId && (
        <AssignCoachModal
          groupId={groupId}
          branchId={branchId}
          assignedCoachIds={assignedCoachIds}
          preferredRole={preferredRole}
          lockRole={lockRole}
          onClose={closeAssignModal}
          onAssigned={loadCoaches}
        />
      )}
    </div>
  );
};

export default GroupCoachesTab;
