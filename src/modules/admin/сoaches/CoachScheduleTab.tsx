import React, { useMemo, useState } from "react";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

import { resolveApiUrl } from "../../../shared/api";
import type { CoachProfile, CoachUpcomingSession, CoachWeeklyScheduleItem } from "./coach.api";

type ScheduleView = "day" | "week" | "month";

interface CoachScheduleTabProps {
  profile: CoachProfile;
  onNavigate: (to: string) => void;
}

const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const backendDayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const asDate = (value: string) => new Date(`${value}T00:00:00`);
const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};
const startOfWeek = (date: Date) => addDays(date, -((date.getDay() + 6) % 7));
const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);
const startOfMonthGrid = (date: Date) => startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
const endOfMonthGrid = (date: Date) => endOfWeek(new Date(date.getFullYear(), date.getMonth() + 1, 0));
const datesBetween = (from: Date, to: Date) => {
  const dates: Date[] = [];
  for (let current = new Date(from); current <= to; current = addDays(current, 1)) dates.push(current);
  return dates;
};
const shortTime = (value?: string | null) => value?.slice(0, 5) || "--:--";
const dateLabel = (date: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
const fullDateLabel = (date: Date) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
const sessionTypeLabel = (value?: string | null) => {
  if (value === "TRIAL") return "Пробное";
  if (value === "INDIVIDUAL") return "Индивидуальное";
  if (value === "REPLACEMENT") return "Замена";
  return "Регулярное";
};
const roleLabel = (value?: string | null) => value === "MAIN" ? "Главный тренер" : value === "ASSISTANT" ? "Ассистент" : "Тренер";
const roleShort = (value?: string | null) => value === "MAIN" ? "MAIN" : value === "ASSISTANT" ? "ASSISTANT" : "COACH";
const roleAccent = (value?: string | null) => value === "MAIN" ? "border-emerald-500" : "border-indigo-400";
const rolePill = (value?: string | null) => value === "MAIN" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700";

const slotIsActiveOn = (slot: CoachWeeklyScheduleItem, date: Date) => {
  const value = isoDate(date);
  return slot.dayOfWeek === backendDayNames[date.getDay()]
    && (!slot.startDate || slot.startDate <= value)
    && (!slot.endDate || slot.endDate >= value);
};

const GroupAvatar: React.FC<{ profile: CoachProfile; groupId: string; name: string }> = ({ profile, groupId, name }) => {
  const avatar = profile.groups.find((group) => group.groupId === groupId)?.avatar;
  const url = avatar?.thumbUrl || avatar?.mediumUrl || avatar?.originalUrl;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-xs font-semibold text-slate-700">
      {url ? <img src={resolveApiUrl(url)} alt="" className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
    </span>
  );
};

const CoachScheduleTab: React.FC<CoachScheduleTabProps> = ({ profile, onNavigate }) => {
  const [view, setView] = useState<ScheduleView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  const calendarDates = useMemo(() => {
    if (view === "day") return [anchorDate];
    if (view === "month") return datesBetween(startOfMonthGrid(anchorDate), endOfMonthGrid(anchorDate));
    return datesBetween(startOfWeek(anchorDate), endOfWeek(anchorDate));
  }, [anchorDate, view]);

  const periodLabel = useMemo(() => {
    if (view === "day") return fullDateLabel(anchorDate);
    if (view === "month") return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(anchorDate);
    const from = startOfWeek(anchorDate);
    const to = endOfWeek(anchorDate);
    return `${from.getDate()} — ${to.getDate()} ${new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(to)}`;
  }, [anchorDate, view]);

  const locations = useMemo(() => Array.from(new Map(
    profile.upcomingSessions
      .filter((session) => session.location?.id)
      .map((session) => [session.location!.id, session.location!.name || "Без названия"])
  ).entries()), [profile.upcomingSessions]);

  const filteredSessions = useMemo(() => profile.upcomingSessions.filter((session) =>
    (groupFilter === "ALL" || session.groupId === groupFilter)
    && (typeFilter === "ALL" || (session.scheduleType || "REGULAR") === typeFilter)
    && (locationFilter === "ALL" || session.location?.id === locationFilter)
  ), [groupFilter, locationFilter, profile.upcomingSessions, typeFilter]);

  const navigatePeriod = (direction: -1 | 1) => {
    if (view === "day") setAnchorDate((current) => addDays(current, direction));
    else if (view === "week") setAnchorDate((current) => addDays(current, direction * 7));
    else setAnchorDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const openSlot = (slot: CoachWeeklyScheduleItem, date: Date) => {
    const materialized = profile.upcomingSessions.find((session) =>
      session.groupId === slot.groupId
      && session.sessionDate === isoDate(date)
      && shortTime(session.startTime) === shortTime(slot.startTime)
    );
    onNavigate(materialized
      ? `/admin/groups/${materialized.groupId}/sessions/${materialized.sessionId}`
      : `/admin/groups/${slot.groupId}/schedule`);
  };

  const openSession = (session: CoachUpcomingSession) => onNavigate(`/admin/groups/${session.groupId}/sessions/${session.sessionId}`);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Расписание тренера</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {([['day', 'День'], ['week', 'Неделя'], ['month', 'Месяц']] as const).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setView(value)} className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${view === value ? "bg-emerald-700 text-white shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>{label}</button>
                ))}
              </div>
              <div className="min-w-48 text-sm font-semibold capitalize text-slate-900">{periodLabel}</div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => navigatePeriod(-1)} aria-label="Предыдущий период" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"><ChevronLeftIcon className="h-4 w-4" /></button>
                <button type="button" onClick={() => setAnchorDate(new Date())} className="rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">Сегодня</button>
                <button type="button" onClick={() => navigatePeriod(1)} aria-label="Следующий период" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700"><ChevronRightIcon className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate(`/admin/coaches/${profile.coachId}/availability`)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"><Cog6ToothIcon className="h-4 w-4" />Настройки расписания</button>
            <button type="button" onClick={() => onNavigate(`/admin/schedule?coachId=${profile.coachId}`)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"><CalendarDaysIcon className="h-4 w-4" />Открыть календарь</button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg">
          <div className={`grid overflow-hidden rounded-lg border border-slate-200 bg-slate-200 ${view === "day" ? "grid-cols-1" : "min-w-[920px] grid-cols-7"}`}>
            {calendarDates.map((date) => {
            const slots = profile.weeklySchedule.filter((slot) => slotIsActiveOn(slot, date)).sort((left, right) => left.startTime.localeCompare(right.startTime));
            const today = isoDate(date) === isoDate(new Date());
            const outsideMonth = view === "month" && date.getMonth() !== anchorDate.getMonth();
            const displayedSlots = view === "month" ? slots.slice(0, 2) : slots;
            return (
              <div key={isoDate(date)} className={`min-w-0 bg-white p-2.5 ${view === "month" ? "min-h-32" : "min-h-60"} ${today ? "ring-1 ring-inset ring-emerald-500" : ""} ${outsideMonth ? "bg-slate-50/80" : ""}`}>
                <div className={`mb-3 text-center ${today ? "text-emerald-700" : outsideMonth ? "text-slate-400" : "text-slate-700"}`}>
                  <div className="text-xs font-semibold">{dayNames[date.getDay()]}</div>
                  <div className="mt-0.5 text-xs">{dateLabel(date)}</div>
                </div>
                <div className="space-y-2">
                  {displayedSlots.map((slot) => {
                    const assignment = profile.groups.find((group) => group.groupId === slot.groupId);
                    return (
                      <button key={`${isoDate(date)}-${slot.scheduleId}`} type="button" onClick={() => openSlot(slot, date)} className={`w-full rounded-md border-l-2 bg-emerald-50/70 px-2.5 py-2 text-left transition hover:bg-emerald-100/80 ${roleAccent(assignment?.role)}`}>
                        <span className="block text-xs font-semibold text-slate-900">{shortTime(slot.startTime)}–{shortTime(slot.endTime)}</span>
                        <span className="mt-1 block truncate text-xs font-medium text-emerald-800">{slot.groupName}</span>
                        {view !== "month" ? <span className="mt-1 block truncate text-[11px] text-slate-500">{roleLabel(assignment?.role)}</span> : null}
                      </button>
                    );
                  })}
                  {!slots.length && view !== "month" ? <div className="flex min-h-28 items-center justify-center text-xs text-slate-400">Нет занятий</div> : null}
                  {view === "month" && slots.length > 2 ? <div className="text-center text-xs font-medium text-slate-500">Ещё {slots.length - 2}</div> : null}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-base font-semibold text-slate-950">Ближайшие занятия</h2></div>
          {filteredSessions.length ? (
            <div className="divide-y divide-slate-100">
              {filteredSessions.map((session) => {
                const assignment = profile.groups.find((group) => group.groupId === session.groupId);
                return (
                  <button key={session.sessionId} type="button" onClick={() => openSession(session)} className={`grid w-full gap-3 border-l-2 px-4 py-3 text-left transition hover:bg-slate-50 md:grid-cols-[130px_minmax(200px,1fr)_150px_120px_100px_24px] md:items-center ${roleAccent(assignment?.role)}`}>
                    <span><span className="block text-sm font-semibold text-slate-900">{dateLabel(asDate(session.sessionDate))} · {dayNames[asDate(session.sessionDate).getDay()]}</span><span className="mt-0.5 block text-xs text-slate-500">{shortTime(session.startTime)}–{shortTime(session.endTime)}</span></span>
                    <span className="flex min-w-0 items-center gap-3"><GroupAvatar profile={profile} groupId={session.groupId} name={session.groupName} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{session.groupName}</span><span className="mt-0.5 block text-xs text-slate-500">{sessionTypeLabel(session.scheduleType)}</span></span></span>
                    <span className="truncate text-sm text-slate-600">{session.groupName}</span>
                    <span className="inline-flex items-center gap-1.5 truncate text-sm text-slate-600"><MapPinIcon className="h-4 w-4 shrink-0 text-slate-400" />{session.location?.name || "Не указано"}</span>
                    <span className={`w-fit rounded-full px-2 py-1 text-[11px] font-semibold ${rolePill(assignment?.role)}`}>{roleShort(assignment?.role)}</span>
                    <ChevronRightIcon className="h-4 w-4 text-slate-400" />
                  </button>
                );
              })}
            </div>
          ) : <div className="px-4 py-12 text-center text-sm text-slate-500">По выбранным фильтрам занятий нет</div>}
          <button type="button" onClick={() => onNavigate(`/admin/schedule?coachId=${profile.coachId}`)} className="m-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Смотреть полный календарь<ChevronRightIcon className="h-4 w-4" /></button>
        </section>

        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Фильтры</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-slate-500">Группа<select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700"><option value="ALL">Все группы</option>{profile.groups.map((group) => <option key={group.groupId} value={group.groupId}>{group.groupName}</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-500">Тип занятия<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700"><option value="ALL">Все типы</option><option value="REGULAR">Регулярное</option><option value="TRIAL">Пробное</option><option value="INDIVIDUAL">Индивидуальное</option></select></label>
            <label className="block text-xs font-medium text-slate-500">Место<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700"><option value="ALL">Все места</option>{locations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase text-slate-400">Легенда</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Главный тренер</div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />Ассистент</div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Замена</div></div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoachScheduleTab;
