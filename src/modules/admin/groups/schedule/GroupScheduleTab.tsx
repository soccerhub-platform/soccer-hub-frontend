import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Ban,
  Pencil,
  Plus,
} from "lucide-react";
import { useAuth } from "../../../../shared/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, EmptyState, ErrorState, LoadingState, ModalShell } from "../../../../shared/ui";
import { GroupApi, GroupCoachApiModel } from "../group.api";
import CoachProfileLink from "../components/CoachProfileLink";
import { AdminSessionApi, AdminSessionListItem } from "../session.api";
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

import { CalendarToolbar, SessionCalendar, SessionPreview, type CalendarView } from "../../calendar/SessionCalendar";
import { businessDate } from "../../../../shared/business-time";
import { validCalendarDate, type WorkspaceSession } from "../../sessions.workspace";
import { weekLabel } from "../../calendar/timeline";
import { getApiErrorMessage } from "../../../../shared/api";

const dayOrder: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
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
  if (!validCalendarDate(value)) value = businessDate();
  const [year, month, day] = value!.split("-").map(Number);
  const result = new Date(year, month - 1, day);
  return Number.isNaN(result.getTime()) ? new Date() : result;
};

const parseMonth = (value: string | null) => {
  if (!value || !validCalendarDate(`${value}-01`)) value = businessDate().slice(0,7);
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

const getRange = (view: CalendarView, anchor: Date) => {
  if (view !== "month") {
    const from = startOfWeek(anchor);
    const to = addDays(from, 6);
    return { from: toDateInput(from), to: toDateInput(to), fromDate: from, toDate: to };
  }
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toDateInput(from), to: toDateInput(to), fromDate: from, toDate: to };
};

const GroupScheduleTab: React.FC<{ groupId: string; groupName?: string }> = ({ groupId, groupName = "Занятие группы" }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const requestVersion = useRef(0);
  const [selected, setSelected] = useState<WorkspaceSession | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const view: CalendarView = searchParams.get("view") === "month" ? "month" : searchParams.get("view") === "agenda" ? "agenda" : "week";
  const anchor = useMemo(
    () => view !== "month" ? parseDate(searchParams.get("date")) : parseMonth(searchParams.get("month")),
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const expected = view !== "month" ? toDateInput(anchor) : toMonthParam(anchor);
    const key = view !== "month" ? "date" : "month";
    if (searchParams.get("view") === view && searchParams.get(key) === expected) return;
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    next.set(key, expected);
    next.delete(view !== "month" ? "month" : "date");
    setSearchParams(next, { replace: true });
  }, [anchor, searchParams, setSearchParams, view]);

  const reload = async () => {
    if (!token) return;
    const version = ++requestVersion.current;
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
      if (version !== requestVersion.current) return;
      setSchedules(scheduleData);
      setArchivedSchedules(allScheduleData.filter((schedule) => schedule.status !== "ACTIVE"));
      setSessions(sessionData.items);
      setOverview(overviewData);
      setCoaches(coachData.coaches);
    } catch (e) {
      console.error("Failed to load group schedule", e);
      if (version === requestVersion.current) setError("Не удалось загрузить расписание группы");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  useEffect(() => { setSelected(null); void reload(); return () => { requestVersion.current++; }; }, [groupId, overviewMonth, range.from, range.to, token]);

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
        ? { key: "new", coachId: coachOptions[0].id, type: "REGULAR" as const, startDate: businessDate(), endDate: "", schedules: [] }
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
    openPeriodEditor({ key: "new", coachId: coachOptions[0].id, type: "REGULAR", startDate: businessDate(), endDate: "", schedules: [] });
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
    if (nextView !== "month") {
      next.set("date", toDateInput(anchor));
      next.delete("month");
    } else {
      next.set("month", toMonthParam(anchor));
      next.delete("date");
    }
    setSearchParams(next);
  };

  const move = (amount: number) => {
    const nextAnchor = view !== "month" ? addDays(anchor, amount * 7) : new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1);
    const next = new URLSearchParams(searchParams);
    next.set(view !== "month" ? "date" : "month", view !== "month" ? toDateInput(nextAnchor) : toMonthParam(nextAnchor));
    setSearchParams(next);
  };

  const goToday = () => {
    const now = parseDate(businessDate());
    const next = new URLSearchParams(searchParams);
    next.set(view !== "month" ? "date" : "month", view !== "month" ? toDateInput(now) : toMonthParam(now));
    setSearchParams(next);
  };

  const toggleCancelled = () => {
    const next = new URLSearchParams(searchParams);
    if (showCancelled) next.delete("cancelled"); else next.set("cancelled", "true");
    setSearchParams(next);
  };

  if (!token) return <ErrorState message="Нет авторизации" />;
  if (loading) return <LoadingState label="Загрузка расписания..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="calendar-workspace flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="ui-card-title">Расписание группы</h2><p className="calendar-muted mt-1 text-sm">Занятия и правила их повторения · время Алматы</p></div><Button onClick={openNewPeriod}><Plus data-icon="inline-start"/>Добавить период</Button></div>
      <Tabs value={searchParams.get("section")==="periods"?"periods":"calendar"} onValueChange={section=>{const next=new URLSearchParams(searchParams);next.set("section",section);setSearchParams(next);}}>
        <TabsList><TabsTrigger value="calendar">Календарь</TabsTrigger><TabsTrigger value="periods">Периоды расписания · {batches.length}</TabsTrigger></TabsList>
        <TabsContent value="calendar" className="flex flex-col gap-3">
          <div className="calendar-surface"><CalendarToolbar date={toDateInput(anchor)} label={view==="month"?formatMonth(anchor):weekLabel(range.from,range.to)} view={view} views={["agenda","week","month"]} onView={setView} onToday={goToday} onMove={move}
            onDate={date=>{const next=new URLSearchParams(searchParams);next.set(view==="month"?"month":"date",view==="month"?date.slice(0,7):date);setSearchParams(next);}}/>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3"><Button variant="secondary" size="sm" aria-pressed={showCancelled} onClick={toggleCancelled}>{showCancelled?"Скрыть отменённые":"Показать отменённые"} · {sessions.filter(s=>s.effectiveStatus==="CANCELLED").length}</Button><span className="calendar-muted text-xs">{visibleSessions.length} занятий</span><Button variant="ghost" size="sm" aria-label="Обновить расписание" onClick={()=>void reload()}><RefreshCw data-icon="inline-start"/></Button></div>
          </div>
          {overview?.risk.hasConflicts && <ErrorState message={`Конфликтов в расписании: ${overview.risk.conflictsCount}`}/>}
          {visibleSessions.length ? <SessionCalendar view={view} month={view==="month"?overviewMonth:undefined}
            days={Array.from({length:view==="month"?Math.ceil(((range.toDate.getTime()-startOfWeek(range.fromDate).getTime())/86400000+1)/7)*7:7},(_,i)=>toDateInput(addDays(startOfWeek(range.fromDate),i)))}
            sessions={visibleSessions.map(s=>({...s,groupId,groupName}))} selectedId={selected?.id} onOpen={setSelected}/> : <EmptyState title="На этот период занятий нет" description="Выберите другую дату или добавьте период расписания."/>}
        </TabsContent>
        <TabsContent value="periods"><SchedulePeriodsContent batches={batches} archivedBatches={archivedBatches} onEdit={openPeriodEditor} onFinish={openFinishPeriod}/></TabsContent>
      </Tabs>
      {selected && <SessionPreview session={selected} returnTo={`/admin/groups/${groupId}/schedule?${searchParams}`} onClose={()=>setSelected(null)}/>}
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
    footer={<div className="flex justify-end"><Button onClick={onCreate}><Plus className="h-4 w-4" />Добавить период</Button></div>}
  >
    <SchedulePeriodsContent batches={batches} archivedBatches={archivedBatches} onEdit={onEdit} onFinish={onFinish}/>
  </ModalShell>
);

const FinishSchedulePeriodDrawer: React.FC<{
  batch: ScheduleBatch & { coachName?: string };
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}> = ({ batch, onClose, onConfirm }) => {
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try { await onConfirm(); } catch (e) { toast.error(getApiErrorMessage(e, "Не удалось завершить период")); } finally { setSaving(false); }
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
      <div className="flex gap-1"><button type="button" onClick={onEdit} aria-label="Редактировать период" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button><button type="button" onClick={onFinish} title="Завершить период" className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 text-rose-600 hover:bg-rose-50"><Ban className="h-4 w-4" /></button></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-1.5">{[...batch.schedules].sort((a, b) => dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek)).map((slot) => <span key={slot.scheduleId} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{fullDayLabels[slot.dayOfWeek]} · {slot.startTime.slice(0, 5)}-{slot.endTime.slice(0, 5)}</span>)}</div>
  </div>
);

export default GroupScheduleTab;

const SchedulePeriodsContent: React.FC<{batches:Array<ScheduleBatch & {coachName?:string}>;archivedBatches:Array<ScheduleBatch & {coachName?:string}>;onEdit:(batch:ScheduleBatch)=>void;onFinish:(batch:ScheduleBatch)=>void}> = ({batches,archivedBatches,onEdit,onFinish}) => (
      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between"><h3 className="ui-section-title">Активные периоды</h3><span className="text-xs text-slate-500">{batches.length}</span></div>
          {batches.length ? <div className="space-y-3">{batches.map((batch) => <PeriodRow key={batch.key} batch={batch} onEdit={() => onEdit(batch)} onFinish={() => onFinish(batch)} />)}</div> : <EmptyState title="Активных периодов нет" description="Добавьте период, чтобы автоматически создавать занятия." />}
        </section>
        {archivedBatches.length ? <section className="border-t border-slate-200 pt-5"><h3 className="mb-3 ui-section-title">История · {archivedBatches.length}</h3><div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3">{archivedBatches.map((batch) => <div key={batch.key} className="py-3 text-sm"><div className="font-medium text-slate-700">{formatPeriodDate(batch.startDate)} - {batch.endDate ? formatPeriodDate(batch.endDate) : "без даты"}</div><div className="mt-1 flex items-center gap-1 text-xs text-slate-500">{batch.coachName ? <CoachProfileLink coachId={batch.coachId} className="text-xs">{batch.coachName}</CoachProfileLink> : "Тренер не указан"}<span>· завершён</span></div></div>)}</div></section> : null}
      </div>

);
