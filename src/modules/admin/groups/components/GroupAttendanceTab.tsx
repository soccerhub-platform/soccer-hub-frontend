import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationCircleIcon,
  NoSymbolIcon,
  UserGroupIcon,
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
} from "../session.api";

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

const formatFullDate = (value: string) => {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date).replace(/^./, (letter) => letter.toUpperCase());
};

const formatRange = (from: string, to: string) => {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return `${from} - ${to}`;
  const start = new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(fromDate);
  const end = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(toDate);
  return `${start}-${end}`;
};

const formatTime = (value: string) => value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);

const isUpcomingSession = (session: AdminGroupAttendanceSession) => {
  if ((session.effectiveStatus ?? session.status) === "CANCELLED") return false;
  const startsAt = new Date(session.startsAt);
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > Date.now();
};

const isFinishedSession = (session: AdminGroupAttendanceSession) => {
  if ((session.effectiveStatus ?? session.status) === "CANCELLED") return false;
  const endsAt = new Date(session.endsAt);
  return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= Date.now();
};

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
  const attendanceView = searchParams.get("view") === "cancelled" ? "cancelled" : "current";

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

  const allSessions = useMemo(() => (
    (attendance?.sessions ?? []).slice().sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  ), [attendance?.sessions]);

  const currentSessions = useMemo(() => allSessions.filter((session) => (
    (session.effectiveStatus ?? session.status) !== "CANCELLED"
  )), [allSessions]);

  const cancelledSessions = useMemo(() => allSessions.filter((session) => (
    (session.effectiveStatus ?? session.status) === "CANCELLED"
  )), [allSessions]);

  const visibleSessions = attendanceView === "cancelled" ? cancelledSessions : currentSessions;

  const displaySummary = useMemo(() => {
    const dueSessions = currentSessions.filter((session) => (
      isFinishedSession(session)
    ));
    const totalMarked = dueSessions.reduce((sum, session) => sum + session.summary.marked, 0);
    const totalPresentLike = dueSessions.reduce((sum, session) => sum + session.summary.presentLike, 0);
    const totalParticipants = dueSessions.reduce((sum, session) => sum + session.summary.total, 0);
    const recordedSessions = dueSessions.filter((session) => (
      session.summary.total > 0 && session.summary.marked >= session.summary.total
    )).length;

    return {
      averageAttendanceRate: totalMarked > 0 ? Math.round((totalPresentLike / totalMarked) * 100) : 0,
      dueSessionsCount: dueSessions.length,
      recordedSessionsCount: recordedSessions,
      pendingSessionsCount: Math.max(0, dueSessions.length - recordedSessions),
      totalUnmarked: Math.max(0, totalParticipants - totalMarked),
      upcomingSessionsCount: currentSessions.filter(isUpcomingSession).length,
    };
  }, [currentSessions]);

  const openSession = (session: AdminGroupAttendanceSession) => {
    const status = session.effectiveStatus ?? session.status;
    if (session.capabilities.canOpenAttendance && !isUpcomingSession(session) && status !== "CANCELLED") {
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

  const setAttendanceView = (view: "current" | "cancelled") => {
    const next = new URLSearchParams(searchParams);
    if (view === "cancelled") {
      next.set("view", "cancelled");
    } else {
      next.delete("view");
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
              <ClipboardDocumentCheckIcon className="h-4 w-4" />
            </span>
            Посещаемость
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDaysIcon className="h-4 w-4" />
            {formatRange(range.from, range.to)} · {currentSessions.length} занятий · прошло: {displaySummary.dueSessionsCount} · предстоит: {displaySummary.upcomingSessionsCount}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="secondary" size="sm" className="h-9 w-9 p-0" rounded="rounded-lg" title="Предыдущий месяц" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <div className="min-w-[154px] px-3 text-center text-sm font-semibold capitalize text-slate-950">
            {formatMonth(month)}
          </div>
          <Button type="button" variant="secondary" size="sm" className="h-9 w-9 p-0" rounded="rounded-lg" title="Следующий месяц" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button type="button" variant="secondary" size="sm" rounded="rounded-lg" onClick={openCurrentMonth}>
            Сегодня
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" rounded="rounded-lg" title="Обновить данные" aria-label="Обновить данные" onClick={load}>
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 xl:grid-cols-3">
        <Metric icon={<CheckCircleIcon className="h-5 w-5" />} label="Средняя явка" value={`${displaySummary.averageAttendanceRate}%`} hint="среди отмеченных учеников" tone="emerald" />
        <Metric icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />} label="Прошедшие журналы" value={`${displaySummary.recordedSessionsCount} из ${displaySummary.dueSessionsCount}`} hint="заполнено полностью" tone="cyan" />
        <Metric icon={<ExclamationCircleIcon className="h-5 w-5" />} label="Не отмечено" value={displaySummary.totalUnmarked} hint="учеников в прошедших занятиях" tone={displaySummary.totalUnmarked > 0 ? "amber" : "slate"} />
      </div>

      {displaySummary.pendingSessionsCount > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <div className="font-semibold">{displaySummary.pendingSessionsCount} {displaySummary.pendingSessionsCount === 1 ? "журнал требует" : "журнала требуют"} заполнения</div>
            <div className="mt-0.5 text-amber-800">
              Учитываются только завершившиеся занятия. Будущие тренировки не влияют на показатели.
            </div>
          </div>
        </div>
      ) : displaySummary.dueSessionsCount > 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
          <CheckBadgeIcon className="h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <span className="font-semibold">Все прошедшие журналы заполнены.</span>
            <span className="ml-1 text-emerald-800">Новых действий по посещаемости пока нет.</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-100/70 p-1">
          <AttendanceViewButton
            active={attendanceView === "current"}
            icon={<CalendarDaysIcon className="h-4 w-4" />}
            label="Актуальные"
            count={currentSessions.length}
            onClick={() => setAttendanceView("current")}
          />
          <AttendanceViewButton
            active={attendanceView === "cancelled"}
            icon={<NoSymbolIcon className="h-4 w-4" />}
            label="История отмен"
            count={cancelledSessions.length}
            onClick={() => setAttendanceView("cancelled")}
          />
        </div>
        {attendanceView === "cancelled" ? (
          <div className="text-sm text-slate-500">Отменённые занятия сохранены для истории и не влияют на показатели.</div>
        ) : null}
      </div>

      {visibleSessions.length === 0 ? (
        <EmptyState
          title={attendanceView === "cancelled" ? "За выбранный период отмен нет" : "За выбранный период занятий нет"}
          description={attendanceView === "cancelled" ? "Все занятия в этом месяце остаются актуальными." : "Смените месяц или проверьте расписание группы."}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(220px,1.35fr)_minmax(230px,1fr)_150px_130px_100px] gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <ColumnTitle icon={<CalendarDaysIcon className="h-3.5 w-3.5" />} label="Дата и время" />
            <ColumnTitle icon={<ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />} label="Журнал" />
            <ColumnTitle icon={<UserGroupIcon className="h-3.5 w-3.5" />} label="Явка" />
            <ColumnTitle icon={<CheckBadgeIcon className="h-3.5 w-3.5" />} label="Состояние" />
            <div className="text-right">Действие</div>
          </div>

          <div className="divide-y divide-slate-100">
            {visibleSessions.map((session) => (
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

const AttendanceViewButton: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}> = ({ active, icon, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
  >
    {icon}
    <span>{label}</span>
    <span className={`rounded px-1.5 py-0.5 text-xs ${active ? "bg-cyan-50 text-cyan-700" : "bg-slate-200/70 text-slate-500"}`}>{count}</span>
  </button>
);

const metricToneClassNames = {
  emerald: "bg-emerald-50 text-emerald-700",
  cyan: "bg-cyan-50 text-cyan-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
};

const Metric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint: string;
  tone: keyof typeof metricToneClassNames;
}> = ({ icon, label, value, hint, tone }) => (
  <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0">
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${metricToneClassNames[tone]}`}>{icon}</span>
    <div className="min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold text-slate-950">{value}</span>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-400">{hint}</div>
    </div>
  </div>
);

const ColumnTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-slate-400">{icon}</span>
    <span>{label}</span>
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
  const percent = marked > 0 ? Math.round((presentLike / marked) * 100) : null;
  const progress = total > 0 ? Math.min(100, Math.round((marked / total) * 100)) : 0;
  const future = isUpcomingSession(session);
  const cancelled = status === "CANCELLED";
  const inProgress = !future && !cancelled && !isFinishedSession(session);
  const today = session.sessionDate === toDateInput(new Date());
  const journalStatus = status === "CANCELLED"
    ? { label: "Отменено", className: "bg-slate-100 text-slate-600" }
    : future
      ? { label: "Предстоит", className: "bg-blue-50 text-blue-700" }
      : inProgress
        ? { label: "Идёт сейчас", className: "bg-cyan-50 text-cyan-700" }
    : total > 0 && marked >= total
      ? { label: "Заполнено", className: "bg-emerald-50 text-emerald-700" }
      : marked > 0
        ? { label: "Частично", className: "bg-amber-50 text-amber-700" }
        : { label: "Не заполнено", className: "bg-orange-50 text-orange-700" };

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group grid w-full grid-cols-1 gap-3 px-4 py-3.5 text-left transition hover:bg-cyan-50/40 lg:grid-cols-[minmax(220px,1.35fr)_minmax(230px,1fr)_150px_130px_100px] lg:items-center lg:gap-4 ${future || cancelled ? "bg-slate-50/35" : "bg-white"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${future ? "bg-blue-50 text-blue-600" : cancelled ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
          <CalendarDaysIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-950">{formatFullDate(session.startsAt)}</span>
            {today ? <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cyan-700">Сегодня</span> : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><ClockIcon className="h-3.5 w-3.5" />{formatTime(session.startsAt)}-{formatTime(session.endsAt)}</div>
        </div>
      </div>

      {future ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClockIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span>Откроется после начала занятия</span>
        </div>
      ) : cancelled ? (
        <div className="text-sm text-slate-500">Журнал не требуется</div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700">{marked} из {total} отмечено</span>
            <span className="text-slate-400">{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${progress >= 100 ? "bg-emerald-500" : progress > 0 ? "bg-amber-500" : "bg-slate-200"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <div className="text-sm font-semibold text-slate-700">
        {future || cancelled || percent == null ? "-" : `${presentLike} из ${marked} · ${percent}%`}
      </div>
      <div><span className={`inline-flex rounded px-2 py-1 text-xs font-semibold ${journalStatus.className}`}>{journalStatus.label}</span></div>

      <div className="flex items-center justify-start gap-1 text-sm font-semibold text-cyan-800 lg:justify-end">
        {future || cancelled ? "Детали" : session.capabilities.canOpenAttendance ? (marked ? "Открыть" : "Заполнить") : "Открыть"}
        <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </button>
  );
};

export default GroupAttendanceTab;
