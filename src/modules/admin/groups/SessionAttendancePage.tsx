import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  MapPinIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../../shared/AuthContext";
import { Button, EmptyState, ErrorState, LoadingState, PageShell } from "../../../shared/ui";
import { getApiErrorMessage, resolveApiUrl } from "../../../shared/api";
import { MediaAsset } from "../../../shared/media.types";
import CoachProfileLink from "./components/CoachProfileLink";
import {
  AdminAttendanceStatus,
  AdminGroupAttendanceSession,
  AdminPersistedAttendanceStatus,
  AdminSessionApi,
  AdminSessionAttendanceOutput,
  AdminSessionAttendanceParticipant,
  AdminSessionDetailsOutput,
  AdminSessionEffectiveStatus,
} from "./session.api";

type AttendanceUiParticipant = Omit<AdminSessionAttendanceParticipant, "status"> & {
  status: AdminAttendanceStatus;
};

const statusLabels: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "Запланировано",
  IN_PROGRESS: "Идёт сейчас",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  OVERDUE: "Требует заполнения",
};

const attendanceLabels: Record<AdminAttendanceStatus, string> = {
  PRESENT: "Присутствовал",
  ABSENT: "Отсутствовал",
  EXCUSED: "Уважительная причина",
  LATE: "Опоздал",
  UNMARKED: "Не отмечено",
};

const attendanceTone: Record<AdminAttendanceStatus, string> = {
  PRESENT: "border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-100",
  ABSENT: "border-rose-200 bg-rose-50 text-rose-700 focus:border-rose-500 focus:ring-rose-100",
  EXCUSED: "border-sky-200 bg-sky-50 text-sky-700 focus:border-sky-500 focus:ring-sky-100",
  LATE: "border-amber-200 bg-amber-50 text-amber-800 focus:border-amber-500 focus:ring-amber-100",
  UNMARKED: "border-slate-200 bg-white text-slate-600 focus:border-cyan-600 focus:ring-cyan-100",
};

const attendanceOptions: AdminPersistedAttendanceStatus[] = ["PRESENT", "ABSENT", "EXCUSED", "LATE"];

const parseLocalDate = (value: string) => {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : new Date(value);
};

const formatDate = (value: string) => {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const formatShortDate = (value: string) => {
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
};

const formatTime = (value: string) => value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);
const toDateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const normalizeParticipant = (participant: AdminSessionAttendanceParticipant): AttendanceUiParticipant => ({
  ...participant,
  status: participant.status ?? "UNMARKED",
  comment: participant.comment ?? "",
});

const buildSummary = (participants: AttendanceUiParticipant[]) => {
  const total = participants.length;
  const present = participants.filter((participant) => participant.status === "PRESENT").length;
  const absent = participants.filter((participant) => participant.status === "ABSENT").length;
  const excused = participants.filter((participant) => participant.status === "EXCUSED").length;
  const late = participants.filter((participant) => participant.status === "LATE").length;
  const unmarked = participants.filter((participant) => participant.status === "UNMARKED").length;
  return { total, present, absent, excused, late, unmarked, marked: total - unmarked, presentLike: present + late };
};

const cloneParticipants = (participants: AttendanceUiParticipant[]) => participants.map((participant) => ({ ...participant }));

const serializeParticipants = (participants: AttendanceUiParticipant[]) => participants
  .map((participant) => ({ playerId: participant.playerId, status: participant.status, comment: participant.comment?.trim() ?? "" }))
  .sort((left, right) => left.playerId.localeCompare(right.playerId));

const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "У";

const participantAvatarUrl = (avatar?: MediaAsset | null) => {
  const url = avatar?.thumbUrl ?? avatar?.mediumUrl ?? avatar?.originalUrl;
  return url ? resolveApiUrl(url) : null;
};

const SessionAttendancePage: React.FC = () => {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [attendance, setAttendance] = useState<AdminSessionAttendanceOutput | null>(null);
  const [session, setSession] = useState<AdminSessionDetailsOutput | null>(null);
  const [sessionChoices, setSessionChoices] = useState<AdminGroupAttendanceSession[]>([]);
  const [participants, setParticipants] = useState<AttendanceUiParticipant[]>([]);
  const [initialParticipants, setInitialParticipants] = useState<AttendanceUiParticipant[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, details] = await Promise.all([
        AdminSessionApi.getAttendance(sessionId, token),
        AdminSessionApi.getDetails(sessionId, token),
      ]);
      const normalizedParticipants = (data.participants ?? []).map(normalizeParticipant);
      setAttendance(data);
      setSession(details);
      setParticipants(normalizedParticipants);
      setInitialParticipants(cloneParticipants(normalizedParticipants));
      setLastSavedAt(null);

      const date = parseLocalDate(data.sessionDate || data.startsAt);
      const from = toDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
      const to = toDateInput(new Date(date.getFullYear(), date.getMonth() + 1, 0));
      try {
        const month = await AdminSessionApi.getGroupAttendance(groupId ?? data.group.id, { from, to }, token);
        setSessionChoices(month.sessions.filter((item) => item.effectiveStatus !== "CANCELLED"));
      } catch (choiceError) {
        console.warn("Failed to load attendance session choices", choiceError);
        setSessionChoices([]);
      }
    } catch (e) {
      console.error("Failed to load session attendance", e);
      setError(getApiErrorMessage(e, "Не удалось загрузить журнал посещаемости"));
      setAttendance(null);
      setSession(null);
      setParticipants([]);
      setInitialParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [sessionId, token]);

  const summary = useMemo(() => buildSummary(participants), [participants]);
  const isDirty = useMemo(() => JSON.stringify(serializeParticipants(participants)) !== JSON.stringify(serializeParticipants(initialParticipants)), [initialParticipants, participants]);
  const canEdit = attendance?.capabilities.canEdit ?? false;
  const backTo = groupId && sessionId ? `/admin/groups/${groupId}/sessions/${sessionId}` : "/admin/groups";

  useEffect(() => {
    if (!isDirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmLeave = () => !isDirty || window.confirm("Есть несохранённые изменения. Уйти без сохранения?");

  const navigateBack = () => {
    if (confirmLeave()) navigate(backTo);
  };

  const changeSession = (nextSessionId: string) => {
    if (!confirmLeave()) return;
    navigate(`/admin/groups/${groupId ?? attendance?.group.id}/sessions/${nextSessionId}/attendance`);
  };

  const setStatus = (playerId: string, status: AdminPersistedAttendanceStatus) => {
    setParticipants((current) => current.map((participant) => participant.playerId === playerId ? { ...participant, status } : participant));
  };

  const setComment = (playerId: string, comment: string) => {
    setParticipants((current) => current.map((participant) => participant.playerId === playerId ? { ...participant, comment } : participant));
  };

  const markUnmarkedPresent = () => {
    setParticipants((current) => current.map((participant) => participant.status === "UNMARKED" ? { ...participant, status: "PRESENT" } : participant));
  };

  const resetChanges = () => setParticipants(cloneParticipants(initialParticipants));

  const submit = async () => {
    if (!token || !sessionId || summary.unmarked > 0) return;
    setSaving(true);
    try {
      const entries = participants.map((participant) => ({
        playerId: participant.playerId,
        status: participant.status as AdminPersistedAttendanceStatus,
        comment: participant.comment?.trim() || null,
      }));
      const next = await AdminSessionApi.updateAttendance(sessionId, { entries }, token);
      const normalizedParticipants = (next.participants ?? []).map(normalizeParticipant);
      setAttendance(next);
      setParticipants(normalizedParticipants);
      setInitialParticipants(cloneParticipants(normalizedParticipants));
      setLastSavedAt(new Date());
      toast.success("Журнал сохранён");
    } catch (e) {
      console.error("Failed to save session attendance", e);
      toast.error(getApiErrorMessage(e, "Не удалось сохранить посещаемость"));
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <ErrorState message="Нет авторизации" />;
  if (loading) return <PageShell><LoadingState label="Загрузка журнала..." /></PageShell>;
  if (error) return <PageShell><ErrorState message={error} onRetry={load} /></PageShell>;
  if (!attendance) return <PageShell><ErrorState message="Журнал посещаемости не найден" /></PageShell>;

  const effectiveStatus = attendance.effectiveStatus ?? attendance.status;

  return (
    <PageShell className="space-y-4 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={navigateBack} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-cyan-800">
          <ArrowLeftIcon className="h-4 w-4" />Назад к занятию
        </button>

        {sessionChoices.length > 1 ? (
          <label className="relative block w-full sm:w-auto">
            <CalendarDaysIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select aria-label="Выбрать занятие" value={sessionId} onChange={(event) => changeSession(event.target.value)} className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 sm:min-w-[240px]">
              {sessionChoices.map((item) => <option key={item.sessionId} value={item.sessionId}>{formatShortDate(item.startsAt)} · {formatTime(item.startsAt)}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-950 sm:text-2xl">{formatDate(attendance.startsAt)}, {formatTime(attendance.startsAt)} - {formatTime(attendance.endsAt)}</h1>
                <span className={`rounded px-2 py-1 text-xs font-semibold ${effectiveStatus === "OVERDUE" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{statusLabels[effectiveStatus]}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><UserGroupIcon className="h-4 w-4" />{attendance.group.name}</span>
                <span className="inline-flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" />{session?.location?.name ?? "Место не указано"}</span>
                <span className="inline-flex items-center gap-1.5"><UserCircleIcon className="h-4 w-4" />{session?.coaches[0] ? <CoachProfileLink coachId={session.coaches[0].id}>{session.coaches[0].fullName}</CoachProfileLink> : "Тренер не назначен"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[500px]">
              <SummaryTile label="Всего" value={summary.total} tone="slate" />
              <SummaryTile label="Присутствуют" value={summary.presentLike} tone="emerald" />
              <SummaryTile label="Отсутствуют" value={summary.absent} tone="rose" />
              <SummaryTile label="Не отмечено" value={summary.unmarked} tone="amber" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Ученики</h2>
              <p className="mt-1 text-xs text-slate-500">{summary.marked} из {summary.total} отмечено · уважительная причина: {summary.excused} · опоздали: {summary.late}</p>
            </div>
            {canEdit && summary.unmarked > 0 ? (
              <Button type="button" variant="soft" size="sm" onClick={markUnmarkedPresent} disabled={saving}>
                <CheckCircleIcon className="h-4 w-4" />Отметить остальных присутствующими
              </Button>
            ) : null}
          </div>

          {participants.length === 0 ? (
            <EmptyState title="В журнале нет учеников" description="Для этой даты занятия участники не найдены." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="hidden grid-cols-[minmax(240px,1fr)_230px_minmax(240px,1fr)] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase text-slate-500 lg:grid">
                <div>Ученик</div><div>Статус</div><div>Комментарий</div>
              </div>
              <div className="divide-y divide-slate-100">
                {participants.map((participant) => (
                  <AttendanceRow key={participant.playerId} participant={participant} canEdit={canEdit} saving={saving} onStatusChange={setStatus} onCommentChange={setComment} />
                ))}
              </div>
            </div>
          )}
        </div>

        {canEdit ? (
          <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="text-sm">
              {isDirty ? <span className="font-medium text-amber-700">Есть несохранённые изменения</span> : lastSavedAt ? <span className="text-emerald-700">Сохранено в {lastSavedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span> : <span className="text-slate-500">Все изменения сохранены</span>}
              {summary.unmarked > 0 ? <span className="ml-2 text-slate-500">Осталось отметить: {summary.unmarked}</span> : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={resetChanges} disabled={saving || !isDirty}>Сбросить</Button>
              <Button type="button" isLoading={saving} onClick={submit} disabled={participants.length === 0 || !isDirty || summary.unmarked > 0}>Сохранить журнал</Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">Журнал доступен только для просмотра.</div>
        )}
      </section>
    </PageShell>
  );
};

const SummaryTile: React.FC<{ label: string; value: number; tone: "slate" | "emerald" | "rose" | "amber" }> = ({ label, value, tone }) => {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };
  return <div className={`rounded-lg border px-3 py-3 text-center ${tones[tone]}`}><div className="text-xl font-semibold">{value}</div><div className="mt-1 text-xs font-medium opacity-75">{label}</div></div>;
};

const AttendanceRow: React.FC<{
  participant: AttendanceUiParticipant;
  canEdit: boolean;
  saving: boolean;
  onStatusChange: (playerId: string, status: AdminPersistedAttendanceStatus) => void;
  onCommentChange: (playerId: string, comment: string) => void;
}> = ({ participant, canEdit, saving, onStatusChange, onCommentChange }) => {
  const avatarUrl = participantAvatarUrl(participant.avatar);

  return (
    <div className="grid grid-cols-1 gap-3 bg-white px-4 py-3.5 lg:grid-cols-[minmax(240px,1fr)_230px_minmax(240px,1fr)] lg:items-center lg:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link to={`/admin/students/${participant.playerId}`} className="shrink-0 rounded-full outline-none ring-cyan-500 focus-visible:ring-2 focus-visible:ring-offset-2" aria-label={`Открыть профиль ${participant.fullName}`}>
          <ParticipantAvatar fullName={participant.fullName} src={avatarUrl} />
        </Link>
        <div className="min-w-0">
          <Link to={`/admin/students/${participant.playerId}`} className="truncate text-sm font-semibold text-slate-950 transition hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
            {participant.fullName}
          </Link>
          <div className="mt-0.5 text-xs text-slate-400">{attendanceLabels[participant.status]}</div>
        </div>
      </div>

      <label className="relative block">
      <select
        aria-label={`Статус: ${participant.fullName}`}
        value={participant.status === "UNMARKED" ? "" : participant.status}
        disabled={!canEdit || saving}
        onChange={(event) => onStatusChange(participant.playerId, event.target.value as AdminPersistedAttendanceStatus)}
        className={`h-10 w-full appearance-none rounded-lg border px-3 pr-9 text-sm font-semibold outline-none transition focus:ring-2 disabled:cursor-default disabled:opacity-75 ${attendanceTone[participant.status]}`}
      >
        <option value="" disabled>Не отмечено</option>
        {attendanceOptions.map((status) => <option key={status} value={status}>{attendanceLabels[status]}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      </label>

      <input
        type="text"
        value={participant.comment ?? ""}
        disabled={!canEdit || saving}
        onChange={(event) => onCommentChange(participant.playerId, event.target.value)}
        placeholder={participant.status === "ABSENT" || participant.status === "EXCUSED" ? "Укажите причину" : "Комментарий"}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500"
      />
    </div>
  );
};

const ParticipantAvatar: React.FC<{ fullName: string; src: string | null }> = ({ fullName, src }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return <img src={src} alt={`Фото ${fullName}`} className="h-9 w-9 rounded-full border border-white object-cover shadow-sm ring-1 ring-slate-200" onError={() => setFailed(true)} />;
  }

  return <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-emerald-100 text-xs font-bold text-cyan-800 ring-1 ring-cyan-200">{getInitials(fullName)}</span>;
};

export default SessionAttendancePage;
