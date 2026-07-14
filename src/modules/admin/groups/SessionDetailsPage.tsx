import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ClockIcon,
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
  SectionCard,
} from "../../../shared/ui";
import { getApiErrorMessage } from "../../../shared/api";
import { useAdminBranch } from "../BranchContext";
import { Coach, CoachApi } from "../сoaches/coach.api";
import { AdminGroupDetailsModel, GroupApi } from "./group.api";
import {
  AdminCancelSessionInput,
  AdminSessionApi,
  AdminSessionDetailsOutput,
  AdminSessionEffectiveStatus,
  AdminSubstituteCoachInput,
} from "./session.api";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [substituteOpen, setSubstituteOpen] = useState(false);

  const load = async () => {
    if (!token || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [details, groupData] = await Promise.all([
        AdminSessionApi.getDetails(sessionId, token),
        groupId ? GroupApi.getDetails(groupId, token).catch(() => null) : Promise.resolve(null),
      ]);
      setSession(details);
      setGroupDetails(groupData);
    } catch (e) {
      console.error("Failed to load session details", e);
      setError("Не удалось загрузить занятие");
      setSession(null);
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
  const expected = Math.max(0, session.attendance.total - session.attendance.marked);

  const applyUpdatedSession = (next: AdminSessionDetailsOutput) => {
    setSession(next);
  };

  return (
    <PageShell className="space-y-5">
      <button
        type="button"
        onClick={() => navigate(backTo)}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-admin-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Назад к расписанию
      </button>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(204,251,241,0.8),rgba(255,255,255,0.97)_44%,rgba(248,250,252,0.96))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {formatDate(session.startsAt)}
                </h1>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[effectiveStatus]}`}>
                  {statusLabels[effectiveStatus]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4 text-cyan-800" />
                  {formatTime(session.startsAt)}-{formatTime(session.endsAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserGroupIcon className="h-4 w-4 text-cyan-800" />
                  {session.group.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="h-4 w-4 text-cyan-800" />
                  {session.location?.name ?? "Локация не указана"}
                </span>
              </div>
              {session.cancelReason ? (
                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  Причина отмены: {session.cancelReason}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
              <MiniCounter label="Всего" value={session.attendance.total} />
              <MiniCounter label="Отмечено" value={session.attendance.marked} />
              <MiniCounter label="Ожидается" value={expected} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <SectionCard title="Тренеры" description="Назначенные тренеры на это конкретное занятие.">
            {session.coaches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Тренеры не назначены
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {session.coaches.map((coach) => (
                  <div key={`${coach.id}-${coach.role}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <UserCircleIcon className="h-10 w-10 text-slate-300" />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">{coach.fullName}</div>
                      <div className="mt-1 text-xs text-slate-500">{roleLabel(coach.role)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Информация" description="Технические данные занятия и связь с расписанием.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoRow label="Период расписания" value={session.scheduleId} />
              <InfoRow label="Дата" value={session.sessionDate} />
              <InfoRow label="Начало" value={formatTime(session.startsAt)} />
              <InfoRow label="Окончание" value={formatTime(session.endsAt)} />
              <InfoRow label="Локация" value={session.location?.name ?? "Не указана"} />
              <InfoRow label="Статус в базе" value={session.status} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="Участники" description="Состояние журнала по занятию.">
            <div className="space-y-3">
              <ProgressRow label="Отмечено" value={session.attendance.marked} total={session.attendance.total} />
              <ProgressRow label="Присутствуют/зачтены" value={session.attendance.presentLike} total={session.attendance.total} tone="success" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Участников в группе: <span className="font-semibold text-slate-950">{session.participantsCount}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Действия" description="Операции применяются только к этому занятию.">
            <div className="space-y-2">
              {session.capabilities.canOpenAttendance ? (
                <Button
                  type="button"
                  className="w-full justify-center"
                  onClick={() => detailsGroupId && navigate(`/admin/groups/${detailsGroupId}/sessions/${session.id}/attendance`)}
                >
                  Открыть журнал посещаемости
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                disabled={!session.capabilities.canSubstituteCoach}
                onClick={() => setSubstituteOpen(true)}
              >
                <UserCircleIcon className="h-4 w-4" />
                Заменить тренера
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                disabled={!session.capabilities.canReschedule}
                onClick={() => setRescheduleOpen(true)}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Перенести занятие
              </Button>

              <Button
                type="button"
                variant="softDanger"
                className="w-full justify-center"
                disabled={!session.capabilities.canCancel}
                onClick={() => setCancelOpen(true)}
              >
                <XCircleIcon className="h-4 w-4" />
                Отменить занятие
              </Button>
            </div>
          </SectionCard>
        </div>
      </div>

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

const MiniCounter: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-3 shadow-sm">
    <div className="text-xl font-semibold text-slate-950">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{label}</div>
  </div>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 break-all text-sm font-medium text-slate-900">{value}</div>
  </div>
);

const ProgressRow: React.FC<{ label: string; value: number; total: number; tone?: "default" | "success" }> = ({
  label,
  value,
  total,
  tone = "default",
}) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-500">{value}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${tone === "success" ? "bg-emerald-600" : "bg-cyan-700"}`}
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
};

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
