import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  EllipsisHorizontalIcon,
  MapPinIcon,
  UserCircleIcon,
  UserGroupIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../../shared/AuthContext";
import {
  Button,
  ErrorState,
  FormField,
  formControlClassName,
  LoadingState,
  ModalShell,
  PageShell,
} from "../../../shared/ui";
import { getApiErrorMessage } from "../../../shared/api";
import { useAdminBranch } from "../BranchContext";
import { Coach, CoachApi } from "../сoaches/coach.api";
import CoachProfileLink from "./components/CoachProfileLink";
import { AdminGroupDetailsModel, GroupApi } from "./group.api";
import {
  AdminCancelSessionInput,
  AdminSessionApi,
  AdminSessionCoach,
  AdminSessionDetailsOutput,
  AdminSessionEffectiveStatus,
  AdminSubstituteCoachInput,
} from "./session.api";
import { ScheduleApi } from "./schedule/schedule.api";
import { GroupScheduleDto } from "./schedule/schedule.types";

const statusLabels: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "Запланировано",
  IN_PROGRESS: "Идет",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  OVERDUE: "Просрочено",
};

const statusClasses: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "border-cyan-100 bg-cyan-50 text-cyan-800",
  IN_PROGRESS: "border-emerald-100 bg-emerald-50 text-emerald-700",
  COMPLETED: "border-slate-200 bg-slate-50 text-slate-600",
  CANCELLED: "border-rose-100 bg-rose-50 text-rose-700",
  OVERDUE: "border-amber-100 bg-amber-50 text-amber-800",
};

const roleLabel = (role: string) => (role === "MAIN" ? "Главный тренер" : role === "ASSISTANT" ? "Ассистент" : role);
const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "Т";

const formatDate = (value: string) => {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const formatTime = (value: string) => {
  return value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);
};
const formatScheduleTime = (value: string) => value.slice(0, 5);

const toDateTimeLocal = (value: string) => {
  if (!value) return "";
  return value.slice(0, 16);
};

const fromDateTimeLocal = (value: string) => value.length === 16 ? `${value}:00` : value;

const SessionDetailsPage: React.FC = () => {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId: selectedBranchId } = useAdminBranch();

  const [session, setSession] = useState<AdminSessionDetailsOutput | null>(null);
  const [groupDetails, setGroupDetails] = useState<AdminGroupDetailsModel | null>(null);
  const [scheduleRule, setScheduleRule] = useState<GroupScheduleDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const load = async () => {
    if (!token || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [details, groupData, scheduleData] = await Promise.all([
        AdminSessionApi.getDetails(sessionId, token),
        groupId ? GroupApi.getDetails(groupId, token).catch(() => null) : Promise.resolve(null),
        groupId ? ScheduleApi.listAllByGroup(groupId, token).catch(() => []) : Promise.resolve([]),
      ]);
      setSession(details);
      setGroupDetails(groupData);
      setScheduleRule(scheduleData.find((item) => item.scheduleId === details.scheduleId) ?? null);
    } catch (e) {
      console.error("Failed to load session details", e);
      setError("Не удалось загрузить занятие");
      setSession(null);
      setScheduleRule(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sessionId, token]);

  const branchId = groupDetails?.branchId ?? groupDetails?.branch?.id ?? groupDetails?.branch?.branchId ?? selectedBranchId ?? null;
  const detailsGroupId = groupId ?? session?.group.id;
  const backTo = groupId ? `/admin/groups/${groupId}/schedule` : "/admin/groups";

  if (!token) return <ErrorState message="Нет авторизации" />;

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Загрузка занятия..." />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <ErrorState message={error} onRetry={load} />
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <ErrorState message="Занятие не найдено" />
      </PageShell>
    );
  }

  const effectiveStatus = session.effectiveStatus ?? session.status;
  const applyUpdatedSession = (next: AdminSessionDetailsOutput) => {
    setSession(next);
  };

  const attendanceComplete = session.attendance.total > 0 && session.attendance.marked >= session.attendance.total;
  const attendanceLabel = effectiveStatus === "CANCELLED"
    ? "Для отменённого занятия журнал не требуется"
    : effectiveStatus === "PLANNED"
      ? "Журнал откроется после начала занятия"
      : attendanceComplete
        ? `${session.attendance.marked} из ${session.attendance.total} учеников отмечено`
        : `${session.attendance.marked} из ${session.attendance.total} учеников отмечено`;

  return (
    <PageShell className="space-y-4">
      <button type="button" onClick={() => navigate(backTo)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-cyan-800">
        <ArrowLeftIcon className="h-4 w-4" />Расписание группы
      </button>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-950">{formatDate(session.startsAt)}</h1>
                <span className={`rounded border px-2 py-1 text-xs font-semibold ${statusClasses[effectiveStatus]}`}>{statusLabels[effectiveStatus]}</span>
              </div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{formatTime(session.startsAt)} - {formatTime(session.endsAt)}</div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" />{session.group.name}</span>
                <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" />{session.location?.name ?? "Место не указано"}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4" />{session.scheduleId ? "Создано расписанием" : "Разовое занятие"}</span>
              </div>
              {session.cancelReason ? <div className="mt-3 inline-flex rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">Причина отмены: {session.cancelReason}</div> : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {session.capabilities.canReschedule ? <Button type="button" variant="secondary" onClick={() => setRescheduleOpen(true)}><ArrowPathIcon className="h-4 w-4" />Перенести</Button> : null}
              {session.capabilities.canSubstituteCoach ? <Button type="button" variant="secondary" onClick={() => setSubstituteOpen(true)}><UserCircleIcon className="h-4 w-4" />Заменить тренера</Button> : null}
              <div className="relative">
                <button type="button" aria-label="Дополнительные действия" title="Дополнительные действия" onClick={() => setMoreOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"><EllipsisHorizontalIcon className="h-5 w-5" /></button>
                {moreOpen ? (
                  <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl shadow-slate-950/10">
                    <button type="button" disabled={!session.capabilities.canCancel} onClick={() => { setMoreOpen(false); setCancelOpen(true); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"><XCircleIcon className="h-4 w-4" />Отменить занятие</button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <div className="space-y-6 p-4 sm:p-6 lg:border-r lg:border-slate-200">
            <section>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-950">Тренеры</h2><span className="text-xs text-slate-500">{session.coaches.length}</span></div>
              {session.coaches.length ? (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">
                  {session.coaches.map((coach) => <CoachRow key={`${coach.id}-${coach.role}`} coach={coach} />)}
                </div>
              ) : <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm text-slate-500">Тренеры не назначены</div>}
            </section>

            <section className="border-t border-slate-200 pt-5">
              <h2 className="text-sm font-semibold text-slate-950">Участники</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Metric label="Ожидается" value={session.participantsCount} />
                <Metric label="Отмечено" value={session.attendance.marked} />
                <Metric label="Присутствуют" value={session.attendance.presentLike} />
              </div>
            </section>
          </div>

          <div className="space-y-6 border-t border-slate-200 p-4 sm:p-6 lg:border-t-0">
            <section>
              <div className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${attendanceComplete ? "bg-emerald-50 text-emerald-700" : "bg-cyan-50 text-cyan-700"}`}><ClipboardDocumentCheckIcon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-slate-950">Посещаемость</h2><p className="mt-1 text-sm text-slate-500">{attendanceLabel}</p></div>
              </div>
              {effectiveStatus !== "PLANNED" && effectiveStatus !== "CANCELLED" && session.capabilities.canOpenAttendance ? (
                <Button type="button" className="mt-4 w-full justify-center" onClick={() => detailsGroupId && navigate(`/admin/groups/${detailsGroupId}/sessions/${session.id}/attendance`)}><ClipboardDocumentCheckIcon className="h-4 w-4" />{attendanceComplete ? "Открыть журнал" : "Заполнить журнал"}</Button>
              ) : null}
            </section>

            <section className="border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" /><h2 className="text-sm font-semibold text-slate-950">Регулярное расписание</h2></div>
              {scheduleRule ? (
                <div className="mt-3 space-y-2 text-sm">
                  <InfoLine label="Период" value={`${formatDate(scheduleRule.startDate)} - ${scheduleRule.endDate ? formatDate(scheduleRule.endDate) : "без даты окончания"}`} />
                  <InfoLine label="Слот" value={`${formatScheduleTime(scheduleRule.startTime)} - ${formatScheduleTime(scheduleRule.endTime)}`} />
                </div>
              ) : <p className="mt-2 text-sm text-slate-500">Связанный период не найден</p>}
              <button type="button" onClick={() => detailsGroupId && navigate(`/admin/groups/${detailsGroupId}/schedule?view=week&date=${session.sessionDate}`)} className="mt-4 text-sm font-semibold text-cyan-800 hover:text-cyan-950">Открыть расписание →</button>
            </section>
          </div>
        </div>
      </section>

      {cancelOpen ? (
        <CancelSessionModal
          sessionId={session.id}
          token={token}
          onClose={() => setCancelOpen(false)}
          onSaved={(next) => {
            applyUpdatedSession(next);
            setCancelOpen(false);
          }}
        />
      ) : null}

      {rescheduleOpen ? (
        <RescheduleSessionModal
          session={session}
          token={token}
          onClose={() => setRescheduleOpen(false)}
          onSaved={(next) => {
            applyUpdatedSession(next);
            setRescheduleOpen(false);
          }}
        />
      ) : null}

      {substituteOpen ? (
        <SubstituteCoachModal
          session={session}
          branchId={branchId}
          token={token}
          onClose={() => setSubstituteOpen(false)}
          onSaved={(next) => {
            applyUpdatedSession(next);
            setSubstituteOpen(false);
          }}
        />
      ) : null}
    </PageShell>
  );
};

const CoachRow: React.FC<{ coach: AdminSessionCoach }> = ({ coach }) => {
  const avatarUrl = coach.avatar?.thumbUrl ?? coach.avatar?.mediumUrl ?? coach.avatar?.originalUrl;
  return (
    <div className="flex items-center gap-3 py-3">
      {avatarUrl ? <img src={avatarUrl} alt={`Фото ${coach.fullName}`} className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-xs font-semibold text-cyan-800">{getInitials(coach.fullName)}</div>}
      <div className="min-w-0"><CoachProfileLink coachId={coach.id} className="max-w-full text-sm font-semibold">{coach.fullName}</CoachProfileLink><div className="mt-0.5 text-xs text-slate-500">{roleLabel(coach.role)}</div></div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => <div className="rounded-lg bg-slate-50 px-3 py-3"><div className="text-lg font-semibold text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div>;

const InfoLine: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="grid grid-cols-[72px_1fr] gap-3"><span className="text-slate-500">{label}</span><span className="font-medium text-slate-800">{value}</span></div>;

const CancelSessionModal: React.FC<{
  sessionId: string;
  token: string;
  onClose: () => void;
  onSaved: (session: AdminSessionDetailsOutput) => void;
}> = ({ sessionId, token, onClose, onSaved }) => {
  const [form, setForm] = useState<AdminCancelSessionInput>({
    reasonCode: "COACH_UNAVAILABLE",
    comment: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const next = await AdminSessionApi.cancel(sessionId, {
        reasonCode: form.reasonCode,
        comment: form.comment?.trim() || undefined,
      }, token);
      toast.success("Занятие отменено");
      onSaved(next);
    } catch (e) {
      console.error("Failed to cancel session", e);
      toast.error(getApiErrorMessage(e, "Не удалось отменить занятие"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Отменить занятие"
      description="Занятие будет отменено только для выбранной даты."
      onClose={onClose}
      closeDisabled={saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Назад</Button>
          <Button type="button" variant="danger" isLoading={saving} onClick={submit}>Отменить занятие</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FormField label="Причина">
          <select
            value={form.reasonCode}
            onChange={(event) => setForm((prev) => ({ ...prev, reasonCode: event.target.value as AdminCancelSessionInput["reasonCode"] }))}
            className={formControlClassName}
          >
            <option value="COACH_UNAVAILABLE">Тренер недоступен</option>
            <option value="LOCATION_UNAVAILABLE">Площадка недоступна</option>
            <option value="WEATHER">Погода</option>
            <option value="HOLIDAY">Праздник</option>
            <option value="ADMIN_DECISION">Решение администратора</option>
            <option value="OTHER">Другое</option>
          </select>
        </FormField>
        <FormField label="Комментарий">
          <textarea
            rows={3}
            value={form.comment}
            onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>
      </div>
    </ModalShell>
  );
};

const RescheduleSessionModal: React.FC<{
  session: AdminSessionDetailsOutput;
  token: string;
  onClose: () => void;
  onSaved: (session: AdminSessionDetailsOutput) => void;
}> = ({ session, token, onClose, onSaved }) => {
  const [form, setForm] = useState({
    startsAt: toDateTimeLocal(session.startsAt),
    endsAt: toDateTimeLocal(session.endsAt),
    locationId: session.location?.id ?? "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.startsAt || !form.endsAt) {
      toast.error("Укажите время начала и окончания");
      return;
    }
    setSaving(true);
    try {
      const next = await AdminSessionApi.reschedule(session.id, {
        startsAt: fromDateTimeLocal(form.startsAt),
        endsAt: fromDateTimeLocal(form.endsAt),
        locationId: form.locationId || undefined,
        reason: form.reason.trim() || undefined,
      }, token);
      toast.success("Занятие перенесено");
      onSaved(next);
    } catch (e) {
      console.error("Failed to reschedule session", e);
      toast.error(getApiErrorMessage(e, "Не удалось перенести занятие"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Перенести занятие"
      description="Изменение применится только к этому занятию."
      onClose={onClose}
      closeDisabled={saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
          <Button type="button" isLoading={saving} onClick={submit}>Перенести</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Начало">
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>
        <FormField label="Окончание">
          <input
            type="datetime-local"
            value={form.endsAt}
            onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>
        <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Площадка</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">
            {session.location?.name ?? "Площадка не указана"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Выбор другой площадки появится после подключения справочника площадок.
          </div>
        </div>
        <FormField label="Причина" className="sm:col-span-2">
          <textarea
            rows={3}
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            className={formControlClassName}
          />
        </FormField>
      </div>
    </ModalShell>
  );
};

const SubstituteCoachModal: React.FC<{
  session: AdminSessionDetailsOutput;
  branchId: string | null;
  token: string;
  onClose: () => void;
  onSaved: (session: AdminSessionDetailsOutput) => void;
}> = ({ session, branchId, token, onClose, onSaved }) => {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdminSubstituteCoachInput>({
    replacedCoachId: session.coaches[0]?.id ?? "",
    substituteCoachId: "",
    reason: "",
  });

  useEffect(() => {
    if (!branchId) return;
    setLoading(true);
    CoachApi.listByBranch(branchId, token, 0, 100)
      .then((page) => setCoaches(page.content ?? []))
      .catch((e) => {
        console.error("Failed to load coaches", e);
        toast.error("Не удалось загрузить тренеров");
      })
      .finally(() => setLoading(false));
  }, [branchId, token]);

  const assignedCoachIds = useMemo(() => new Set(session.coaches.map((coach) => coach.id)), [session.coaches]);
  const availableCoaches = coaches.filter((coach) => !assignedCoachIds.has(coach.id));

  const replacedCoach = session.coaches.find((coach) => coach.id === form.replacedCoachId) ?? null;

  const submit = async () => {
    if (!form.replacedCoachId || !form.substituteCoachId) {
      toast.error("Выберите тренеров для замены");
      return;
    }
    setSaving(true);
    try {
      const next = await AdminSessionApi.substituteCoach(session.id, {
        replacedCoachId: form.replacedCoachId,
        substituteCoachId: form.substituteCoachId,
        reason: form.reason?.trim() || undefined,
      }, token);
      toast.success("Тренер заменен");
      onSaved(next);
    } catch (e) {
      console.error("Failed to substitute coach", e);
      toast.error(getApiErrorMessage(e, "Не удалось заменить тренера"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title="Заменить тренера"
      description="Замена применяется только к этому занятию."
      onClose={onClose}
      closeDisabled={saving}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button>
          <Button type="button" isLoading={saving} disabled={loading || !branchId} onClick={submit}>Назначить замену</Button>
        </div>
      }
    >
      {!branchId ? (
        <ErrorState message="Не удалось определить филиал для загрузки тренеров" />
      ) : (
        <div className="space-y-4">
          <FormField label="Кого заменить">
            <select
              value={form.replacedCoachId}
              onChange={(event) => setForm((prev) => ({ ...prev, replacedCoachId: event.target.value }))}
              className={formControlClassName}
            >
              {session.coaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.fullName} · {roleLabel(coach.role)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Новый тренер" hint={replacedCoach ? `Роль сохранится: ${roleLabel(replacedCoach.role)}` : undefined}>
            <select
              value={form.substituteCoachId}
              onChange={(event) => setForm((prev) => ({ ...prev, substituteCoachId: event.target.value }))}
              className={formControlClassName}
              disabled={loading}
            >
              <option value="">{loading ? "Тренеры загружаются..." : "Выберите тренера"}</option>
              {availableCoaches.map((coach) => (
                <option key={coach.id} value={coach.id}>
                  {coach.firstName} {coach.lastName}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Причина">
            <textarea
              rows={3}
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              className={formControlClassName}
            />
          </FormField>
        </div>
      )}
    </ModalShell>
  );
};

export default SessionDetailsPage;
