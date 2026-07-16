import React, { useEffect, useState } from "react";
import {
  EnvelopeIcon,
  PhoneIcon,
  UserMinusIcon,
  ArrowPathIcon,
  UserPlusIcon,
  EllipsisHorizontalIcon,
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
import CoachProfileLink from "./CoachProfileLink";

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

const coachInitials = (firstName: string, lastName: string) => `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "ТР";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                <UserPlusIcon className="h-4 w-4" />
              </span>
              Тренеры
            </div>
          <div className="text-xs text-slate-500">
            {coaches.length > 0 ? `${coaches.length} назначено` : "Пока никого не назначили"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={loadCoaches} disabled={loading}>
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!branchId}
            onClick={() => setShowAssign(true)}
          >
            <UserPlusIcon className="h-4 w-4" />
            Назначить тренера
          </Button>
        </div>
      </div>

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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(260px,1fr)_160px_220px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid">
            <div>Тренер</div>
            <div>Роль</div>
            <div>Контакты</div>
            <div className="text-right">Действие</div>
          </div>
          <div className="divide-y divide-slate-100">
          {coaches.map((coach) => (
            <div
              key={coach.groupCoachId}
              className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(260px,1fr)_160px_220px_120px] md:items-center md:gap-4"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-cyan-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  {coachInitials(coach.coachFirstName, coach.coachLastName)}
                </div>

                <div className="min-w-0">
                  <CoachProfileLink coachId={coach.coachId} className="max-w-full">
                    {coach.coachFirstName} {coach.coachLastName}
                  </CoachProfileLink>
                  <div className="mt-1 text-xs text-slate-500 md:hidden">
                    {ROLE_LABELS[coach.coachRole]}
                  </div>
                </div>
              </div>

              <div>
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${ROLE_STYLES[coach.coachRole]}`}
                >
                  {ROLE_LABELS[coach.coachRole]}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <EnvelopeIcon className="h-4 w-4" />
                  <span className="truncate">{coach.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PhoneIcon className="h-4 w-4" />
                  <span>{coach.phone}</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                variant="secondary"
                isLoading={removingId === coach.groupCoachId}
                onClick={() => removeCoach(coach.groupCoachId)}
                className="h-9 w-9 justify-center p-0 md:justify-self-end"
                aria-label={`Убрать тренера ${coach.coachFirstName} ${coach.coachLastName}`}
                title="Убрать тренера"
              >
                {removingId === coach.groupCoachId ? (
                  <UserMinusIcon className="h-4 w-4" />
                ) : (
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
          </div>
        </div>
      )}

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
