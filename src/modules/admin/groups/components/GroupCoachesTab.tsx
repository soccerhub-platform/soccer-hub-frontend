import React, { useEffect, useState } from "react";
import {
  UserMinusIcon,
  ArrowPathIcon,
  UserPlusIcon,
  EllipsisHorizontalIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Link, useSearchParams } from "react-router-dom";
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
import { resolveApiUrl } from "../../../../shared/api";
import { getApiErrorMessage } from "../../../../shared/api";
import toast from "react-hot-toast";
import type { MediaAsset } from "../../../../shared/media.types";
import RemoveCoachDrawer from "./RemoveCoachDrawer";
import CoachAssignmentHistoryDrawer from "./CoachAssignmentHistoryDrawer";

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

const WORK_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Доступен",
  BUSY: "Занят",
  VACATION: "В отпуске",
};

const WORK_STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "text-emerald-700",
  BUSY: "text-amber-700",
  VACATION: "text-sky-700",
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const CoachAvatar: React.FC<{ firstName: string; lastName: string; avatar?: MediaAsset | null }> = ({ firstName, lastName, avatar }) => {
  const rawUrl = avatar?.thumbUrl ?? avatar?.mediumUrl ?? avatar?.originalUrl;
  const src = rawUrl ? resolveApiUrl(rawUrl) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return <img src={src} alt={`Фото ${firstName} ${lastName}`} className="h-10 w-10 rounded-full border border-white object-cover shadow-sm ring-1 ring-slate-200" onError={() => setFailed(true)} />;
  }

  return <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-cyan-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200">{coachInitials(firstName, lastName)}</span>;
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
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const drawer = searchParams.get("drawer");
  const selectedGroupCoachId = searchParams.get("groupCoachId");
  const preferredRole = searchParams.get("action") === "assign-main" ? "MAIN" : "ASSISTANT";
  const lockRole = searchParams.get("action") === "assign-main";
  const assignOpen = drawer === "assign-coach" || lockRole;
  const historyOpen = drawer === "coach-history";
  const coachToRemove = drawer === "remove-coach"
    ? coaches.find((coach) => coach.groupCoachId === selectedGroupCoachId) ?? null
    : null;

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

  const openDrawer = (name: "assign-coach" | "coach-history" | "remove-coach", groupCoachId?: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", name);
    if (groupCoachId) next.set("groupCoachId", groupCoachId);
    else next.delete("groupCoachId");
    if (name === "assign-coach") next.delete("action");
    setSearchParams(next);
  };

  const closeDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    next.delete("groupCoachId");
    next.delete("action");
    setSearchParams(next, { replace: true });
  };

  const updateCoachRole = async (coach: GroupCoachApiModel, role: "MAIN" | "ASSISTANT") => {
    if (!token || coach.coachRole === role) return;
    setUpdatingRoleId(coach.groupCoachId);
    setOpenMenuId(null);
    try {
      await GroupApi.updateCoachRole(coach.groupCoachId, role, token);
      toast.success(role === "MAIN" ? "Назначен главный тренер" : "Роль изменена на ассистента");
      await loadCoaches();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Не удалось изменить роль тренера"));
    } finally {
      setUpdatingRoleId(null);
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
          <Button type="button" size="sm" variant="secondary" onClick={() => openDrawer("coach-history")}>
            <ClockIcon className="h-4 w-4" />
            История
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={loadCoaches} disabled={loading}>
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!branchId}
            onClick={() => openDrawer("assign-coach")}
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
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(240px,1.2fr)_140px_180px_170px_minmax(170px,0.8fr)_56px] gap-4 rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <div>Тренер</div>
            <div>Роль</div>
            <div>Назначение</div>
            <div>Нагрузка</div>
            <div>Следующее занятие</div>
            <div />
          </div>
          <div className="divide-y divide-slate-100">
          {coaches.map((coach) => (
            <div
              key={coach.groupCoachId}
              className="grid grid-cols-1 gap-3 px-4 py-3.5 transition hover:bg-slate-50/60 lg:grid-cols-[minmax(240px,1.2fr)_140px_180px_170px_minmax(170px,0.8fr)_56px] lg:items-center lg:gap-4"
            >
              <div className="flex min-w-0 gap-3">
                <CoachAvatar firstName={coach.coachFirstName} lastName={coach.coachLastName} avatar={coach.avatar} />

                <div className="min-w-0">
                  <CoachProfileLink coachId={coach.coachId} className="max-w-full">
                    {coach.coachFirstName} {coach.coachLastName}
                  </CoachProfileLink>
                  <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                    <span className="truncate">{coach.specialization || coach.email || "Специализация не указана"}</span>
                    {coach.workStatus ? <span className={WORK_STATUS_STYLES[coach.workStatus] ?? "text-slate-500"}>· {WORK_STATUS_LABELS[coach.workStatus] ?? coach.workStatus}</span> : null}
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

              <div className="space-y-1 text-xs text-slate-600">
                <div className="font-medium text-slate-800">с {formatDate(coach.assignedFrom) ?? "не указано"}</div>
                <div className="text-slate-400">{coach.assignedTo ? `до ${formatDate(coach.assignedTo)}` : "без даты окончания"}</div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><BriefcaseIcon className="h-4 w-4 text-slate-400" />{coach.load?.weeklySessionsCount ?? 0} из {coach.load?.maxWeeklySessions ?? 12}</span>
                  <span className="text-slate-400">{coach.load?.groupsCount ?? 1} гр.</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${coach.load?.status === "OVERLOADED" ? "bg-rose-500" : coach.load?.status === "HIGH" ? "bg-amber-500" : "bg-cyan-600"}`} style={{ width: `${Math.min(coach.load?.percentage ?? 0, 100)}%` }} />
                </div>
              </div>

              <div className="text-xs">
                {coach.nextSession ? (
                  <Link to={`/admin/groups/${groupId}/sessions/${coach.nextSession.sessionId}`} className="group inline-flex items-start gap-2 font-medium text-slate-700 hover:text-cyan-700">
                    <CalendarDaysIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-cyan-600" />
                    <span><span className="block">{formatDate(coach.nextSession.sessionDate)}</span><span className="mt-0.5 block text-slate-400">{coach.nextSession.startsAt.slice(0, 5)}{coach.nextSession.endsAt ? `–${coach.nextSession.endsAt.slice(0, 5)}` : ""}</span></span>
                  </Link>
                ) : <span className="text-slate-400">Не запланировано</span>}
              </div>

              <div className="relative md:justify-self-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  isLoading={updatingRoleId === coach.groupCoachId}
                  onClick={() => setOpenMenuId((current) => current === coach.groupCoachId ? null : coach.groupCoachId)}
                  className="h-9 w-9 justify-center p-0"
                  aria-label={`Действия с тренером ${coach.coachFirstName} ${coach.coachLastName}`}
                  aria-expanded={openMenuId === coach.groupCoachId}
                >
                  <EllipsisHorizontalIcon className="h-4 w-4" />
                </Button>
                {openMenuId === coach.groupCoachId ? (
                  <div className="absolute bottom-10 right-0 z-30 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-xl">
                    {coach.coachRole !== "MAIN" && coach.capabilities?.canSetMain !== false ? (
                      <button type="button" className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50" onClick={() => updateCoachRole(coach, "MAIN")}>Сделать главным</button>
                    ) : null}
                    {coach.coachRole !== "ASSISTANT" && coach.capabilities?.canSetAssistant !== false ? (
                      <button type="button" className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50" onClick={() => updateCoachRole(coach, "ASSISTANT")}>Сделать ассистентом</button>
                    ) : null}
                    <button
                      type="button"
                      disabled={coach.capabilities?.canUnassign === false}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      onClick={() => {
                        setOpenMenuId(null);
                        openDrawer("remove-coach", coach.groupCoachId);
                      }}
                    >
                      <UserMinusIcon className="h-4 w-4" />
                      Убрать из группы
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {assignOpen && branchId && (
        <AssignCoachModal
          groupId={groupId}
          branchId={branchId}
          assignedCoachIds={assignedCoachIds}
          preferredRole={preferredRole}
          lockRole={lockRole}
          onClose={closeDrawer}
          onAssigned={loadCoaches}
        />
      )}

      {coachToRemove ? (
        <RemoveCoachDrawer
          coach={coachToRemove}
          onClose={closeDrawer}
          onRemoved={loadCoaches}
        />
      ) : null}

      {historyOpen ? (
        <CoachAssignmentHistoryDrawer groupId={groupId} onClose={closeDrawer} />
      ) : null}
    </div>
  );
};

export default GroupCoachesTab;
