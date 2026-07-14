import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  MinusCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { getApiErrorMessage } from "../../../shared/api";
import {
  AdminAttendanceStatus,
  AdminPersistedAttendanceStatus,
  AdminSessionApi,
  AdminSessionAttendanceOutput,
  AdminSessionAttendanceParticipant,
  AdminSessionEffectiveStatus,
} from "./session.api";

type AttendanceUiParticipant = Omit<AdminSessionAttendanceParticipant, "status"> & {
  status: AdminAttendanceStatus;
};

const statusLabels: Record<AdminSessionEffectiveStatus, string> = {
  PLANNED: "Запланировано",
  IN_PROGRESS: "Идет",
  COMPLETED: "Завершено",
  CANCELLED: "Отменено",
  OVERDUE: "Просрочено",
};

const attendanceLabels: Record<AdminAttendanceStatus, string> = {
  PRESENT: "Был",
  ABSENT: "Нет",
  EXCUSED: "Уваж.",
  LATE: "Опоздал",
  UNMARKED: "Не отмечено",
};

const attendanceOptions: Array<{
  value: AdminAttendanceStatus;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { value: "PRESENT", label: "Был", icon: CheckCircleIcon },
  { value: "ABSENT", label: "Нет", icon: MinusCircleIcon },
  { value: "EXCUSED", label: "Уваж.", icon: ExclamationCircleIcon },
  { value: "LATE", label: "Опоздал", icon: ClockIcon },
];

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

const formatTime = (value: string) => value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);

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
  const marked = total - unmarked;
  const presentLike = present + late;

  return { total, marked, present, absent, excused, late, unmarked, presentLike };
};

const cloneParticipants = (participants: AttendanceUiParticipant[]) => (
  participants.map((participant) => ({ ...participant }))
);

const serializeParticipants = (participants: AttendanceUiParticipant[]) => (
  participants
    .map((participant) => ({
      playerId: participant.playerId,
      status: participant.status,
      comment: participant.comment?.trim() ?? "",
    }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId))
);

const SessionAttendancePage: React.FC = () => {
  const { groupId, sessionId } = useParams<{ groupId: string; sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = user?.accessToken;

  const [attendance, setAttendance] = useState<AdminSessionAttendanceOutput | null>(null);
  const [participants, setParticipants] = useState<AttendanceUiParticipant[]>([]);
  const [initialParticipants, setInitialParticipants] = useState<AttendanceUiParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await AdminSessionApi.getAttendance(sessionId, token);
      const normalizedParticipants = (data.participants ?? []).map(normalizeParticipant);
      setAttendance(data);
      setParticipants(normalizedParticipants);
      setInitialParticipants(cloneParticipants(normalizedParticipants));
    } catch (e) {
      console.error("Failed to load session attendance", e);
      setError(getApiErrorMessage(e, "Не удалось загрузить журнал посещаемости"));
      setAttendance(null);
      setParticipants([]);
      setInitialParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [sessionId, token]);

  const summary = useMemo(() => buildSummary(participants), [participants]);
  const isDirty = useMemo(() => (
    JSON.stringify(serializeParticipants(participants)) !== JSON.stringify(serializeParticipants(initialParticipants))
  ), [initialParticipants, participants]);
  const canEdit = attendance?.capabilities.canEdit ?? false;
  const backTo = groupId && sessionId ? `/admin/groups/${groupId}/sessions/${sessionId}` : "/admin/groups";

  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const navigateBack = () => {
    if (isDirty && !window.confirm("Есть несохранённые изменения. Уйти без сохранения?")) return;
    navigate(backTo);
  };

  const setStatus = (playerId: string, status: AdminAttendanceStatus) => {
    setParticipants((prev) => prev.map((participant) => (
      participant.playerId === playerId ? { ...participant, status } : participant
    )));
  };

  const setComment = (playerId: string, comment: string) => {
    setParticipants((prev) => prev.map((participant) => (
      participant.playerId === playerId ? { ...participant, comment } : participant
    )));
  };

  const markAllPresent = () => {
    setParticipants((prev) => prev.map((participant) => ({
      ...participant,
      status: "PRESENT",
    })));
  };

  const resetChanges = () => {
    setParticipants(cloneParticipants(initialParticipants));
  };

  const submit = async () => {
    if (!token || !sessionId) return;
    setSaving(true);
    try {
      const entries = participants
        .filter((participant): participant is AttendanceUiParticipant & { status: AdminPersistedAttendanceStatus } => participant.status !== "UNMARKED")
        .map((participant) => ({
          playerId: participant.playerId,
          status: participant.status,
          comment: participant.comment?.trim() || null,
        }));
      const next = await AdminSessionApi.updateAttendance(sessionId, { entries }, token);
      const normalizedParticipants = (next.participants ?? []).map(normalizeParticipant);
      setAttendance(next);
      setParticipants(normalizedParticipants);
      setInitialParticipants(cloneParticipants(normalizedParticipants));
      toast.success("Посещаемость сохранена");
    } catch (e) {
      console.error("Failed to save session attendance", e);
      toast.error(getApiErrorMessage(e, "Не удалось сохранить посещаемость"));
    } finally {
      setSaving(false);
    }
  };

  if (!token) return <ErrorState message="Нет авторизации" />;

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Загрузка журнала..." />
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

  if (!attendance) {
    return (
      <PageShell>
        <ErrorState message="Журнал посещаемости не найден" />
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-5">
      <button
        type="button"
        onClick={navigateBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-admin-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Назад к занятию
      </button>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(204,251,241,0.8),rgba(255,255,255,0.97)_44%,rgba(248,250,252,0.96))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Журнал посещаемости
                </h1>
                <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                  {statusLabels[attendance.effectiveStatus ?? attendance.status]}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                <span>{formatDate(attendance.startsAt)}</span>
                <span>{formatTime(attendance.startsAt)}-{formatTime(attendance.endsAt)}</span>
                {attendance.group?.name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <UserGroupIcon className="h-4 w-4 text-cyan-800" />
                    {attendance.group.name}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4 lg:min-w-[520px]">
              <SummaryTile label="Всего" value={summary.total} />
              <SummaryTile label="Отмечено" value={summary.marked} />
              <SummaryTile label="Было" value={summary.presentLike} />
              <SummaryTile label="Не отмечено" value={summary.unmarked} />
            </div>
          </div>
        </div>
      </section>

      <SectionCard
        title="Игроки"
        description={canEdit ? "Отметьте статусы и сохраните журнал одним действием." : "Журнал доступен только для просмотра."}
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <InlineStat label="Присутствовали" value={summary.present} />
            <InlineStat label="Отсутствовали" value={summary.absent} />
            <InlineStat label="Уважительная" value={summary.excused} />
            <InlineStat label="Опоздали" value={summary.late} />
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={resetChanges} disabled={saving || !isDirty}>
                Сбросить изменения
              </Button>
              <Button type="button" variant="secondary" onClick={markAllPresent} disabled={saving || participants.length === 0}>
                Отметить всех присутствующими
              </Button>
            </div>
          ) : null}
        </div>

        {canEdit && isDirty ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Есть несохранённые изменения в журнале.
          </div>
        ) : null}

        {participants.length === 0 ? (
          <EmptyState
            title="В журнале нет игроков"
            description="Backend не вернул участников для этой даты занятия."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[minmax(220px,1fr)_360px_minmax(180px,260px)] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <div>Игрок</div>
              <div>Статус</div>
              <div>Комментарий</div>
            </div>

            <div className="divide-y divide-slate-100">
              {participants.map((participant) => (
                <AttendanceRow
                  key={participant.playerId}
                  participant={participant}
                  canEdit={canEdit}
                  saving={saving}
                  onStatusChange={setStatus}
                  onCommentChange={setComment}
                />
              ))}
            </div>
          </div>
        )}

        {canEdit ? (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {isDirty ? (
              <span className="text-sm text-slate-500">Сохраните журнал, чтобы изменения попали в занятие.</span>
            ) : null}
            <Button type="button" isLoading={saving} onClick={submit} disabled={participants.length === 0 || !isDirty}>
              Сохранить журнал
            </Button>
          </div>
        ) : null}
      </SectionCard>
    </PageShell>
  );
};

const SummaryTile: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-3 shadow-sm">
    <div className="text-xl font-semibold text-slate-950">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{label}</div>
  </div>
);

const InlineStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-sm font-semibold text-slate-950">{value}</div>
    <div className="mt-0.5 text-slate-500">{label}</div>
  </div>
);

const AttendanceRow: React.FC<{
  participant: AttendanceUiParticipant;
  canEdit: boolean;
  saving: boolean;
  onStatusChange: (playerId: string, status: AdminAttendanceStatus) => void;
  onCommentChange: (playerId: string, comment: string) => void;
}> = ({ participant, canEdit, saving, onStatusChange, onCommentChange }) => (
  <div className="grid grid-cols-1 gap-3 bg-white px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_360px_minmax(180px,260px)] lg:items-center">
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold text-slate-950">{participant.fullName}</div>
      <div className="mt-1 text-xs text-slate-500">{attendanceLabels[participant.status]}</div>
    </div>

    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {attendanceOptions.map((option) => {
        const Icon = option.icon;
        const selected = participant.status === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={!canEdit || saving}
            onClick={() => onStatusChange(participant.playerId, option.value)}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition ${
              selected
                ? "border-cyan-200 bg-cyan-50 text-cyan-900"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800"
            } ${!canEdit ? "cursor-default opacity-80" : ""}`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>

    <input
      type="text"
      value={participant.comment ?? ""}
      disabled={!canEdit || saving}
      onChange={(event) => onCommentChange(participant.playerId, event.target.value)}
      placeholder="Комментарий"
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-500"
    />
  </div>
);

export default SessionAttendancePage;
