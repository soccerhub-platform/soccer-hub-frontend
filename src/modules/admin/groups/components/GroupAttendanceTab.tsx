import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../../shared/ui";
import {
  AdminGroupAttendanceOutput,
  AdminGroupAttendanceSession,
  AdminSessionApi,
  AdminSessionEffectiveStatus,
} from "../session.api";

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

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthRange = (month: Date) => {
  const from = new Date(month.getFullYear(), month.getMonth(), 1);
  const to = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return { from: toDateInput(from), to: toDateInput(to) };
};

const getMonthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const toMonthParam = (date: Date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
);

const parseMonthParam = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
};

const formatMonth = (date: Date) => (
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date)
);

const formatDate = (value: string) => {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
  }).format(date);
};

const formatTime = (value: string) => value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);

const GroupAttendanceTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [attendance, setAttendance] = useState<AdminGroupAttendanceOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monthParam = searchParams.get("month");
  const month = useMemo(() => (
    parseMonthParam(monthParam) ?? getMonthStart(new Date())
  ), [monthParam]);
  const range = useMemo(() => getMonthRange(month), [month]);
  const normalizedMonthParam = toMonthParam(month);

  useEffect(() => {
    if (monthParam === normalizedMonthParam) return;
    const next = new URLSearchParams(searchParams);
    next.set("month", normalizedMonthParam);
    setSearchParams(next, { replace: true });
  }, [monthParam, normalizedMonthParam, searchParams, setSearchParams]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await AdminSessionApi.getGroupAttendance(groupId, range, token);
      setAttendance(data);
    } catch (e) {
      console.error("Failed to load group attendance", e);
      setError("Не удалось загрузить посещаемость группы");
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [groupId, range.from, range.to, token]);

  const sessions = useMemo(() => (
    (attendance?.sessions ?? []).slice().sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  ), [attendance?.sessions]);

  const openSession = (session: AdminGroupAttendanceSession) => {
    if (session.capabilities.canOpenAttendance) {
      navigate(`/admin/groups/${groupId}/sessions/${session.sessionId}/attendance`);
      return;
    }
    navigate(`/admin/groups/${groupId}/sessions/${session.sessionId}`);
  };

  const shiftMonth = (delta: number) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    const next = new URLSearchParams(searchParams);
    next.set("month", toMonthParam(nextMonth));
    setSearchParams(next);
  };

  const openCurrentMonth = () => {
    const next = new URLSearchParams(searchParams);
    next.set("month", toMonthParam(getMonthStart(new Date())));
    setSearchParams(next);
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (loading) {
    return <LoadingState label="Загрузка посещаемости..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const summary = attendance?.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <CalendarDaysIcon className="h-4 w-4" />
            {range.from} - {range.to}
          </div>
          <div className="mt-1 text-xl font-semibold capitalize text-slate-950">{formatMonth(month)}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => shiftMonth(-1)}>
            <ChevronLeftIcon className="h-4 w-4" />
            Предыдущий
          </Button>
          <Button type="button" variant="secondary" onClick={openCurrentMonth}>
            Текущий месяц
          </Button>
          <Button type="button" variant="secondary" onClick={() => shiftMonth(1)}>
            Следующий
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric label="Средняя" value={`${summary.averageAttendanceRate}%`} hint="посещаемость" />
          <Metric label="Занятий" value={summary.sessionsCount} hint="за период" />
          <Metric label="Заполнено" value={`${summary.recordedSessionsCount}/${summary.sessionsCount}`} hint="журналов" />
          <Metric label="Присутствуют" value={summary.totalPresentLike} hint={`из ${summary.totalParticipants}`} />
          <Metric label="Не отмечено" value={summary.totalUnmarked} hint="по журналам" />
        </div>
      ) : null}

      {summary && summary.sessionsCount > summary.recordedSessionsCount ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ClipboardDocumentCheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Есть незаполненные журналы</div>
            <div className="mt-0.5">
              Заполнено {summary.recordedSessionsCount} из {summary.sessionsCount}. Откройте занятие из списка ниже, чтобы закрыть журнал.
            </div>
          </div>
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState
          title="За выбранный период занятий нет"
          description="Смените месяц или проверьте расписание группы."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[150px_110px_150px_1fr_160px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <div>Дата</div>
            <div>Время</div>
            <div>Статус</div>
            <div>Журнал</div>
            <div className="text-right">Действие</div>
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <AttendanceSessionRow
                key={session.sessionId}
                session={session}
                onOpen={() => openSession(session)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number; hint: string }> = ({ label, value, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="text-xl font-semibold text-slate-950">{value}</div>
    <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
    <div className="mt-0.5 text-xs text-slate-400">{hint}</div>
  </div>
);

const AttendanceSessionRow: React.FC<{
  session: AdminGroupAttendanceSession;
  onOpen: () => void;
}> = ({ session, onOpen }) => {
  const status = session.effectiveStatus ?? session.status;
  const total = session.summary.total;
  const marked = session.summary.marked;
  const presentLike = session.summary.presentLike;
  const percent = total > 0 ? Math.round((presentLike / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-1 gap-3 bg-white px-4 py-4 text-left transition hover:bg-cyan-50/40 lg:grid-cols-[150px_110px_150px_1fr_160px] lg:items-center"
    >
      <div>
        <div className="text-sm font-semibold text-slate-950">{formatDate(session.startsAt)}</div>
        <div className="mt-1 text-xs text-slate-500 lg:hidden">{formatTime(session.startsAt)}-{formatTime(session.endsAt)}</div>
      </div>

      <div className="hidden text-sm text-slate-600 lg:block">
        {formatTime(session.startsAt)}-{formatTime(session.endsAt)}
      </div>

      <div>
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[status]}`}>
          {statusLabels[status]}
        </span>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
          <span className="font-semibold">{marked}/{total} отмечено</span>
          <span>{presentLike} присутствуют</span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-cyan-600" style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-start gap-2 text-sm font-semibold text-cyan-800 lg:justify-end">
        {session.capabilities.canOpenAttendance ? "Открыть журнал" : "Открыть занятие"}
        <ArrowPathIcon className="h-4 w-4" />
      </div>
    </button>
  );
};

export default GroupAttendanceTab;
