import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../../shared/AuthContext";
import { Button, EmptyState, ErrorState, LoadingState, ModalShell } from "../../../../shared/ui";
import { GroupApi, GroupCoachApiModel } from "../group.api";
import CoachProfileLink from "../components/CoachProfileLink";
import { AdminSessionApi, AdminSessionEffectiveStatus, AdminSessionListItem } from "../session.api";
import EditScheduleModal from "./EditScheduleModal";
import { groupSchedulesToBatches } from "./schedule.batch";
import { ScheduleApi } from "./schedule.api";
import {
  DayOfWeek,
  GroupScheduleDto,
  GroupScheduleOverview,
  ScheduleBatch,
  ScheduleValidationResult,
  UpdateScheduleBatchCommand,
} from "./schedule.types";

type CalendarView = "week" | "month";

const dayOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const shortDayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const fullDayLabels: Record<DayOfWeek, string> = {
  MONDAY: "Пн", TUESDAY: "Вт", WEDNESDAY: "Ср", THURSDAY: "Чт", FRIDAY: "Пт", SATURDAY: "Сб", SUNDAY: "Вс",
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(year, month - 1, day);
  return Number.isNaN(result.getTime()) ? new Date() : result;
};

const parseMonth = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
};

const toMonthParam = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const formatMonth = (date: Date) => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
const formatPeriodDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(parseDate(value));
const formatTime = (value: string) => value.split("T")[1]?.slice(0, 5) ?? value.slice(11, 16);
const sessionDateKey = (session: AdminSessionListItem) => session.sessionDate || session.startsAt.slice(0, 10);

const formatWeekRange = (start: Date, end: Date) => {
  const startText = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: start.getMonth() === end.getMonth() ? undefined : "short" }).format(start);
  const endText = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(end);
  return `${startText} - ${endText}`;
};

const getRange = (view: CalendarView, anchor: Date) => {
  if (view === "week") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    return { from: toDateInput(from), to: toDateInput(to), fromDate: from, toDate: to };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toDateInput(from), to: toDateInput(to), fromDate: from, toDate: to };
};

const GroupScheduleTab: React.FC<{ groupId: string }> = ({ groupId }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: CalendarView = searchParams.get("view") === "month" ? "month" : "week";
  const anchor = useMemo(
    () => view === "week" ? parseDate(searchParams.get("date")) : parseMonth(searchParams.get("month")),
    [searchParams, view],
  );
  const range = useMemo(() => getRange(view, anchor), [anchor, view]);
  const showCancelled = searchParams.get("cancelled") === "true";
  const drawer = searchParams.get("drawer");
  const overviewMonth = toMonthParam(anchor);

  const [schedules, setSchedules] = useState<GroupScheduleDto[]>([]);
  const [archivedSchedules, setArchivedSchedules] = useState<GroupScheduleDto[]>([]);
  const [sessions, setSessions] = useState<AdminSessionListItem[]>([]);
  const [overview, setOverview] = useState<GroupScheduleOverview | null>(null);
  const [coaches, setCoaches] = useState<GroupCoachApiModel[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const expected = view === "week" ? toDateInput(anchor) : toMonthParam(anchor);
    const key = view === "week" ? "date" : "month";
    if (searchParams.get("view") === view && searchParams.get(key) === expected) return;
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    next.set(key, expected);
    next.delete(view === "week" ? "month" : "date");
    setSearchParams(next, { replace: true });
  }, [anchor, searchParams, setSearchParams, view]);

  const reload = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [scheduleData, allScheduleData, sessionData, overviewData, coachData] = await Promise.all([
        ScheduleApi.listByGroup(groupId, token),
        ScheduleApi.listAllByGroup(groupId, token),
        AdminSessionApi.listByGroup(groupId, { from: range.from, to: range.to }, token),
        ScheduleApi.getOverview(groupId, overviewMonth, token),
        GroupApi.getCoaches(groupId, token),
      ]);
      setSchedules(scheduleData);
      setArchivedSchedules(allScheduleData.filter((schedule) => schedule.status !== "ACTIVE"));
      setSessions(sessionData.items);
      setOverview(overviewData);
      setCoaches(coachData.coaches);
    } catch (e) {
      console.error("Failed to load group schedule", e);
      setError("Не удалось загрузить расписание группы");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [groupId, overviewMonth, range.from, range.to, token]);

  const coachMap = useMemo(() => Object.fromEntries(coaches.map((coach) => [
    coach.coachId,
    `${coach.coachFirstName} ${coach.coachLastName}${coach.coachRole === "MAIN" ? " · главный" : ""}`,
  ])), [coaches]);
  const coachOptions = coaches.map((coach) => ({ id: coach.coachId, name: coachMap[coach.coachId] }));
  const batches = groupSchedulesToBatches(schedules).map((batch) => ({ ...batch, coachName: coachMap[batch.coachId] }));
  const archivedBatches = groupSchedulesToBatches(archivedSchedules).map((batch) => ({ ...batch, coachName: coachMap[batch.coachId] }));
  const visibleSessions = sessions.filter((session) => showCancelled || (session.effectiveStatus ?? session.status) !== "CANCELLED");
  const editingBatch = drawer === "schedule-period"
    ? searchParams.get("mode") === "create"
      ? coachOptions.length > 0
        ? { key: "new", coachId: coachOptions[0].id, type: "REGULAR" as const, startDate: toDateInput(new Date()), endDate: "", schedules: [] }
        : null
      : [...batches, ...archivedBatches].find((batch) => batch.key === searchParams.get("periodKey")) ?? null
    : null;
  const finishingBatch = drawer === "finish-schedule-period"
    ? batches.find((batch) => batch.key === searchParams.get("periodKey")) ?? null
    : null;

  const closeScheduleDrawer = (replace = true) => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    next.delete("mode");
    next.delete("periodKey");
    setSearchParams(next, { replace });
  };

  const openPeriodsDrawer = () => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "schedule-periods");
    next.delete("mode");
    next.delete("periodKey");
    setSearchParams(next);
  };

  const openPeriodEditor = (batch: ScheduleBatch) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "schedule-period");
    if (batch.key === "new") {
      next.set("mode", "create");
      next.delete("periodKey");
    } else {
      next.set("mode", "edit");
      next.set("periodKey", batch.key);
    }
    setSearchParams(next);
  };

  const openFinishPeriod = (batch: ScheduleBatch) => {
    const next = new URLSearchParams(searchParams);
    next.set("drawer", "finish-schedule-period");
    next.delete("mode");
    next.set("periodKey", batch.key);
    setSearchParams(next);
  };

  const openNewPeriod = () => {
    if (!coachOptions.length) {
      toast.error("Сначала назначьте тренера группе");
      return;
    }
    openPeriodEditor({ key: "new", coachId: coachOptions[0].id, type: "REGULAR", startDate: toDateInput(new Date()), endDate: "", schedules: [] });
  };

  const validateAndSaveBatch = async (payload: UpdateScheduleBatchCommand): Promise<ScheduleValidationResult> => {
    if (!token) throw new Error("Нет авторизации");
    const validation = await ScheduleApi.validateGroupSchedule(groupId, {
      ...payload,
      ...(editingBatch?.key !== "new" ? { excludeScheduleIds: editingBatch?.schedules.map((item) => item.scheduleId) } : {}),
    }, token);
    if (!validation.valid) return validation;
    if (editingBatch?.key === "new") await ScheduleApi.createGroupSchedule(groupId, payload, token);
    else await ScheduleApi.updateGroupSchedule(groupId, payload, token);
    closeScheduleDrawer();
    await reload();
    return validation;
  };

  const finishBatch = async (batch: ScheduleBatch) => {
    if (!token) return;
    await ScheduleApi.deleteBatch(groupId, { coachId: batch.coachId, type: batch.type, startDate: batch.startDate, endDate: batch.endDate }, token);
    toast.success("Период завершён");
    closeScheduleDrawer();
    await reload();
  };

  const setView = (nextView: CalendarView) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", nextView);
    if (nextView === "week") {
      next.set("date", toDateInput(anchor));
      next.delete("month");
    } else {
      next.set("month", toMonthParam(anchor));
      next.delete("date");
    }
    setSearchParams(next);
  };

  const move = (amount: number) => {
    const nextAnchor = view === "week" ? addDays(anchor, amount * 7) : new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1);
    const next = new URLSearchParams(searchParams);
    next.set(view === "week" ? "date" : "month", view === "week" ? toDateInput(nextAnchor) : toMonthParam(nextAnchor));
    setSearchParams(next);
  };

  const goToday = () => {
    const now = new Date();
    const next = new URLSearchParams(searchParams);
    next.set(view === "week" ? "date" : "month", view === "week" ? toDateInput(now) : toMonthParam(now));
    setSearchParams(next);
  };

  const toggleCancelled = () => {
    const next = new URLSearchParams(searchParams);
    if (showCancelled) next.delete("cancelled"); else next.set("cancelled", "true");
    setSearchParams(next);
    setActionsOpen(false);
  };

  if (!token) return <ErrorState message="Нет авторизации" />;
  if (loading) return <LoadingState label="Загрузка расписания..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><CalendarDaysIcon className="h-4 w-4" /></span>
            Расписание
          </div>
          <div className="mt-1.5 text-sm text-slate-500">Занятия группы и управление регулярными периодами.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-10 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <CalendarViewButton active={view === "week"} onClick={() => setView("week")}>Неделя</CalendarViewButton>
            <CalendarViewButton active={view === "month"} onClick={() => setView("month")}>Месяц</CalendarViewButton>
          </div>
          <Button type="button" onClick={openNewPeriod}><PlusIcon className="h-4 w-4" />Добавить период</Button>
          <div className="relative">
            <Button type="button" variant="secondary" onClick={() => setActionsOpen((current) => !current)}>
              Действия<ChevronDownIcon className="h-4 w-4" />
            </Button>
            {actionsOpen ? (
              <div className="absolute right-0 top-12 z-20 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl shadow-slate-950/10">
                <MenuButton icon={<CalendarDaysIcon />} label="Управление периодами" onClick={() => { openPeriodsDrawer(); setActionsOpen(false); }} />
                <MenuButton icon={<NoSymbolIcon />} label={showCancelled ? "Скрыть отменённые" : "Показать отменённые"} active={showCancelled} onClick={toggleCancelled} />
                <MenuButton icon={<ArrowPathIcon />} label="Обновить данные" onClick={() => { setActionsOpen(false); void reload(); }} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="h-9 w-9 p-0" title="Назад" onClick={() => move(-1)}><ChevronLeftIcon className="h-4 w-4" /></Button>
          <div className="min-w-[190px] text-center text-sm font-semibold capitalize text-slate-950">
            {view === "week" ? formatWeekRange(range.fromDate, range.toDate) : formatMonth(anchor)}
          </div>
          <Button variant="secondary" size="sm" className="h-9 w-9 p-0" title="Вперёд" onClick={() => move(1)}><ChevronRightIcon className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={goToday}>Сегодня</Button>
        </div>
        <div className="text-xs text-slate-500">
          {visibleSessions.length} {visibleSessions.length === 1 ? "занятие" : "занятий"}
          {!showCancelled && sessions.length !== visibleSessions.length ? ` · ${sessions.length - visibleSessions.length} отменённых скрыто` : ""}
        </div>
      </div>

      {overview?.risk.hasConflicts ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          В расписании обнаружено конфликтов: {overview.risk.conflictsCount}
        </div>
      ) : null}

      {view === "week" ? (
        <WeekCalendar start={range.fromDate} sessions={visibleSessions} onOpen={(session) => navigate(`/admin/groups/${groupId}/sessions/${session.id}`)} />
      ) : (
        <MonthCalendar month={anchor} sessions={visibleSessions} onOpen={(session) => navigate(`/admin/groups/${groupId}/sessions/${session.id}`)} />
      )}

      <CalendarLegend showCancelled={showCancelled} />

      {drawer === "schedule-periods" ? (
        <SchedulePeriodsDrawer
          batches={batches}
          archivedBatches={archivedBatches}
          onClose={() => closeScheduleDrawer()}
          onCreate={openNewPeriod}
          onEdit={openPeriodEditor}
          onFinish={openFinishPeriod}
        />
      ) : null}

      {editingBatch ? <EditScheduleModal coaches={coachOptions} initialCoachId={editingBatch.coachId} initialType={editingBatch.type} schedules={editingBatch.schedules} startDate={editingBatch.startDate} endDate={editingBatch.endDate} onClose={() => closeScheduleDrawer()} onSave={validateAndSaveBatch} /> : null}
      {finishingBatch ? <FinishSchedulePeriodDrawer batch={finishingBatch} onClose={() => closeScheduleDrawer()} onConfirm={() => finishBatch(finishingBatch)} /> : null}
    </div>
  );
};

const CalendarViewButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`h-8 rounded-md px-4 text-sm font-semibold transition ${active ? "bg-cyan-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>{children}</button>
);

const MenuButton: React.FC<{ icon: React.ReactElement; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950">
    {React.cloneElement(icon, { className: `h-4 w-4 ${active ? "text-cyan-700" : "text-slate-400"}` })}<span className="flex-1">{label}</span>{active ? <CheckCircleIcon className="h-4 w-4 text-cyan-700" /> : null}
  </button>
);

const WeekCalendar: React.FC<{ start: Date; sessions: AdminSessionListItem[]; onOpen: (session: AdminSessionListItem) => void }> = ({ start, sessions, onOpen }) => {
  const today = toDateInput(new Date());
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid min-w-[900px] grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(start, index);
          const key = toDateInput(date);
          const daySessions = sessions.filter((session) => sessionDateKey(session) === key).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const isToday = key === today;
          return (
            <section key={key} className={`min-h-[420px] border-r border-slate-200 last:border-r-0 ${isToday ? "bg-cyan-50/30" : "bg-white"}`}>
              <div className={`border-b border-slate-200 px-3 py-3 text-center ${isToday ? "bg-cyan-50" : "bg-slate-50/70"}`}>
                <div className={`text-xs font-semibold uppercase ${isToday ? "text-cyan-700" : "text-slate-500"}`}>{shortDayLabels[index]}</div>
                <div className={`mt-1 text-lg font-semibold ${isToday ? "text-cyan-800" : "text-slate-950"}`}>{date.getDate()}</div>
              </div>
              <div className="space-y-2 p-2.5">
                {daySessions.length ? daySessions.map((session) => <CalendarSessionCard key={session.id} session={session} onOpen={() => onOpen(session)} />) : <div className="py-8 text-center text-xs text-slate-400">Нет занятий</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

const MonthCalendar: React.FC<{ month: Date; sessions: AdminSessionListItem[]; onOpen: (session: AdminSessionListItem) => void }> = ({ month, sessions, onOpen }) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), 6);
  const days = Array.from({ length: Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1 }, (_, index) => addDays(gridStart, index));
  const today = toDateInput(new Date());
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="grid min-w-[840px] grid-cols-7 border-b border-slate-200 bg-slate-50/80">
        {shortDayLabels.map((label) => <div key={label} className="border-r border-slate-200 px-3 py-2.5 text-center text-xs font-semibold uppercase text-slate-500 last:border-r-0">{label}</div>)}
      </div>
      <div className="grid min-w-[840px] grid-cols-7">
        {days.map((date) => {
          const key = toDateInput(date);
          const daySessions = sessions.filter((session) => sessionDateKey(session) === key).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const outside = date.getMonth() !== month.getMonth();
          return (
            <div key={key} className={`min-h-[124px] border-b border-r border-slate-200 p-2 last:border-r-0 ${outside ? "bg-slate-50/60" : key === today ? "bg-cyan-50/30" : "bg-white"}`}>
              <div className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${key === today ? "bg-cyan-700 text-white" : outside ? "text-slate-300" : "text-slate-700"}`}>{date.getDate()}</div>
              {!outside ? (
                <div className="space-y-1.5">
                  {daySessions.slice(0, 3).map((session) => <MonthSessionChip key={session.id} session={session} onOpen={() => onOpen(session)} />)}
                  {daySessions.length > 3 ? <div className="px-1 text-xs font-medium text-slate-500">Ещё {daySessions.length - 3}</div> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const sessionTone = (status: AdminSessionEffectiveStatus) => {
  if (status === "CANCELLED") return { card: "border-slate-200 bg-slate-50 text-slate-500", dot: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-500" };
  if (status === "IN_PROGRESS") return { card: "border-emerald-300 bg-emerald-50 text-emerald-950", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (status === "COMPLETED" || status === "OVERDUE") return { card: "border-emerald-200 bg-white text-slate-800", dot: "bg-emerald-500", chip: "border-emerald-100 bg-emerald-50/70 text-emerald-800" };
  return { card: "border-cyan-200 bg-cyan-50/70 text-slate-900", dot: "bg-cyan-600", chip: "border-cyan-200 bg-cyan-50 text-cyan-900" };
};

const CalendarSessionCard: React.FC<{ session: AdminSessionListItem; onOpen: () => void }> = ({ session, onOpen }) => {
  const status = session.effectiveStatus ?? session.status;
  const tone = sessionTone(status);
  const coach = session.coaches[0];
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} className={`w-full cursor-pointer rounded-lg border p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${tone.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">{formatTime(session.startsAt)} - {formatTime(session.endsAt)}</span>
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      </div>
      <div className="mt-2 flex items-center gap-1.5 truncate text-xs"><UserCircleIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />{coach ? <CoachProfileLink coachId={coach.id} className="max-w-full text-xs" showArrow={false}>{coach.fullName}</CoachProfileLink> : <span className="truncate">Тренер не назначен</span>}</div>
      <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] opacity-70"><MapPinIcon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{session.location?.name ?? "Место не указано"}</span></div>
      {status === "CANCELLED" ? <div className="mt-2 text-[11px] font-semibold">Отменено</div> : null}
    </div>
  );
};

const MonthSessionChip: React.FC<{ session: AdminSessionListItem; onOpen: () => void }> = ({ session, onOpen }) => {
  const status = session.effectiveStatus ?? session.status;
  const tone = sessionTone(status);
  const coach = session.coaches[0];
  return <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} title={`${formatTime(session.startsAt)} - ${coach?.fullName ?? "Без тренера"}`} className={`flex w-full cursor-pointer items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${tone.chip}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} /><span>{formatTime(session.startsAt)}</span>{coach ? <CoachProfileLink coachId={coach.id} className="max-w-full text-[11px] font-normal opacity-75" showArrow={false}>{coach.fullName}</CoachProfileLink> : <span className="truncate font-normal opacity-75">Без тренера</span>}</div>;
};

const CalendarLegend: React.FC<{ showCancelled: boolean }> = ({ showCancelled }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
    <Legend color="bg-cyan-600" label="Запланировано" />
    <Legend color="bg-emerald-500" label="Идёт или завершено" />
    {showCancelled ? <Legend color="bg-slate-400" label="Отменено" /> : null}
  </div>
);

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-sm ${color}`} />{label}</span>;

const SchedulePeriodsDrawer: React.FC<{
  batches: Array<ScheduleBatch & { coachName?: string }>;
  archivedBatches: Array<ScheduleBatch & { coachName?: string }>;
  onClose: () => void;
  onCreate: () => void;
  onEdit: (batch: ScheduleBatch) => void;
  onFinish: (batch: ScheduleBatch) => void;
}> = ({ batches, archivedBatches, onClose, onCreate, onEdit, onFinish }) => (
  <ModalShell
    title="Периоды расписания"
    description="Правила, по которым автоматически создаются будущие занятия."
    placement="right"
    maxWidthClassName="max-w-xl"
    onClose={onClose}
    footer={<div className="flex justify-end"><Button onClick={onCreate}><PlusIcon className="h-4 w-4" />Добавить период</Button></div>}
  >
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-slate-950">Активные периоды</h3><span className="text-xs text-slate-500">{batches.length}</span></div>
          {batches.length ? <div className="space-y-3">{batches.map((batch) => <PeriodRow key={batch.key} batch={batch} onEdit={() => onEdit(batch)} onFinish={() => onFinish(batch)} />)}</div> : <EmptyState title="Активных периодов нет" description="Добавьте период, чтобы автоматически создавать занятия." />}
        </section>
        {archivedBatches.length ? <section className="border-t border-slate-200 pt-5"><h3 className="mb-3 text-sm font-semibold text-slate-950">История · {archivedBatches.length}</h3><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">{archivedBatches.map((batch) => <div key={batch.key} className="py-3 text-sm"><div className="font-medium text-slate-700">{formatPeriodDate(batch.startDate)} - {batch.endDate ? formatPeriodDate(batch.endDate) : "без даты"}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500">{batch.coachName ? <CoachProfileLink coachId={batch.coachId} className="text-xs">{batch.coachName}</CoachProfileLink> : "Тренер не указан"}<span>· завершён</span></div></div>)}</div></section> : null}
      </div>
  </ModalShell>
);

const FinishSchedulePeriodDrawer: React.FC<{
  batch: ScheduleBatch & { coachName?: string };
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}> = ({ batch, onClose, onConfirm }) => {
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await onConfirm(); } finally { setSaving(false); }
  };
  return (
    <ModalShell
      title="Завершить период"
      description="Новые занятия по этому правилу больше создаваться не будут."
      placement="right"
      maxWidthClassName="max-w-lg"
      closeDisabled={saving}
      onClose={onClose}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Отмена</Button><Button variant="danger" isLoading={saving} onClick={submit}>Завершить период</Button></div>}
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Будущие занятия этого периода будут отменены. Прошедшие занятия и журналы посещаемости сохранятся.
        </div>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 text-sm">
          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Период</span><span className="text-right font-medium text-slate-900">{formatPeriodDate(batch.startDate)} - {batch.endDate ? formatPeriodDate(batch.endDate) : "без даты"}</span></div>
          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Тренер</span><span className="text-right font-medium text-slate-900">{batch.coachName ?? "Не указан"}</span></div>
          <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Слотов в неделю</span><span className="font-medium text-slate-900">{batch.schedules.length}</span></div>
        </div>
      </div>
    </ModalShell>
  );
};

const PeriodRow: React.FC<{ batch: ScheduleBatch & { coachName?: string }; onEdit: () => void; onFinish: () => void }> = ({ batch, onEdit, onFinish }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <div className="flex items-start justify-between gap-3">
      <div><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-950">{batch.type === "REGULAR" ? "Регулярный период" : "Временный период"}</span><span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Активен</span></div><div className="mt-1 text-xs text-slate-500">{formatPeriodDate(batch.startDate)} - {batch.endDate ? formatPeriodDate(batch.endDate) : "без даты окончания"}</div><div className="mt-2 text-sm text-slate-700">{batch.coachName ? <CoachProfileLink coachId={batch.coachId}>{batch.coachName}</CoachProfileLink> : "Тренер не указан"}</div></div>
      <div className="flex gap-1"><button type="button" onClick={onEdit} title="Редактировать период" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={onFinish} title="Завершить период" className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50"><NoSymbolIcon className="h-4 w-4" /></button></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">{batch.schedules.sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)).map((slot) => <span key={slot.scheduleId} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{fullDayLabels[slot.dayOfWeek]} · {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}</span>)}</div>
  </div>
);

export default GroupScheduleTab;
