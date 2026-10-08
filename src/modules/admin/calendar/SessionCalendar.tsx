import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Users, UserRound, X, Ban, Pencil, Building2, ClipboardList } from "lucide-react";
import { ActionMenu, Button, DatePicker, ModalShell, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import { ShadcnButton } from "../../../shared/ui/shadcn/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../shared/ui/shadcn/popover";
import { cn } from "../../../shared/ui/utils";
import { businessDate } from "../../../shared/business-time";
import { calendarDateLabel, sessionStatusLabels, sessionTimeLabel, validCalendarDate, type WorkspaceSession } from "../sessions.workspace";

import { dayEntries, timelineBlocks, timelineBounds, type TimelineEntry } from "./timeline";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../shared/ui/shadcn/Table";
export type SessionAction = "cancel" | "reschedule" | "substitute";

export type CalendarView = "agenda" | "week" | "month";

export function CalendarToolbar({date, label, view, views = ["agenda", "week"], onView, onDate, onMove, onToday, actions}: {
  date: string; label: string; view: CalendarView; views?: CalendarView[];
  onView: (view: CalendarView) => void; onDate: (date: string) => void;
  onMove: (amount: number) => void; onToday: () => void; actions?: React.ReactNode;
}) {
  const [dateOpen, setDateOpen] = useState(false);
  return <div className="calendar-toolbar">
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <Button variant="secondary" size="sm" onClick={onToday}>Сегодня</Button>
      <Button variant="ghost" size="sm" aria-label={view === "month" ? "Предыдущий месяц" : "Предыдущая неделя"} onClick={()=>onMove(-1)}><ChevronLeft data-icon="inline-start"/></Button>
      <Button variant="ghost" size="sm" aria-label={view === "month" ? "Следующий месяц" : "Следующая неделя"} onClick={()=>onMove(1)}><ChevronRight data-icon="inline-start"/></Button>
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild><Button variant="ghost" size="sm" aria-label="Выбрать дату"><CalendarDays data-icon="inline-start"/><span aria-live="polite">{label}</span></Button></PopoverTrigger>
        <PopoverContent align="start"><label className="flex flex-col gap-2 text-sm">Перейти к дате<DatePicker placeholder="Перейти к дате" value={date} onValueChange={value=>{if(validCalendarDate(value)){onDate(value);setDateOpen(false);}}}/></label></PopoverContent>
      </Popover>
    </div>
    <div className="flex items-center gap-2">
      <ToggleGroup type="single" variant="outline" size="sm" value={view} aria-label="Вид занятий" onValueChange={v=>{if(v)onView(v as CalendarView);}}>
        {views.map(v=><ToggleGroupItem key={v} value={v}>{{agenda:"Список",week:"Неделя",month:"Месяц"}[v]}</ToggleGroupItem>)}
      </ToggleGroup>
      {actions}
    </div>
  </div>;
}

export function SessionStatus({session}: {session: WorkspaceSession}) {
  const status = session.effectiveStatus ?? session.status;
  return <span className="calendar-status" data-status={status}><span aria-hidden="true"/>{sessionStatusLabels[status]}</span>;
}

export function SessionCalendar({days, sessions, view, onOpen, month, selectedId, onAction, returnTo = "/admin/schedule"}: {
  days: string[]; sessions: WorkspaceSession[]; view: CalendarView;
  onOpen: (session: WorkspaceSession) => void; month?: string; selectedId?: string | null;
  onAction?: (session: WorkspaceSession, action: SessionAction) => void; returnTo?: string;
}) {
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const today = businessDate();
  const ordered = [...sessions].sort((a,b)=>a.startsAt.localeCompare(b.startsAt));
  if (view === "week") return <WeekTimeline days={days} sessions={sessions} selectedId={selectedId} onOpen={onOpen}/>;
  if (view === "agenda") return <SessionList days={days} sessions={sessions} selectedId={selectedId} onOpen={onOpen} onAction={onAction} returnTo={returnTo}/>;
  return <div className={cn("calendar-board", `calendar-board--${view}`)} aria-label="Календарь занятий">
    <div className="calendar-board-grid">
      {days.map(day=>{
        const items = ordered.filter(s=>s.sessionDate === day);
        const outside = Boolean(month && !day.startsWith(month));
        const expanded = expandedDays.includes(day);
        const shown = view === "month" && !expanded ? items.slice(0,3) : items;
        return <section key={day} aria-label={calendarDateLabel(day)} className={cn("calendar-day", !items.length && "calendar-day--empty", outside && "calendar-day--outside")}>
          <div className="calendar-day-heading" data-today={day===today}>
            <h2><span>{new Intl.DateTimeFormat("ru-RU",{weekday:"short",timeZone:"UTC"}).format(new Date(`${day}T12:00:00Z`))}</span><span className="calendar-day-number">{Number(day.slice(8))}</span></h2>
            <span className="calendar-day-count">{day === today ? "Сегодня" : items.length ? `${items.length} зан.` : "—"}</span>
          </div>
          <div className="calendar-day-items">
            {shown.map(s=><article key={s.id} data-session-id={s.id}>
              <button type="button" className="calendar-event" data-status={s.effectiveStatus ?? s.status} onClick={()=>onOpen(s)} aria-label={`${sessionTimeLabel(s.startsAt)} · ${s.groupName} · ${sessionStatusLabels[s.effectiveStatus ?? s.status]}`}>
                <span className="calendar-event-time">{sessionTimeLabel(s.startsAt)}<span>–{sessionTimeLabel(s.endsAt)}</span></span>
                <span className="calendar-event-info"><span className="calendar-event-name">{s.groupName}</span><span className="calendar-event-coach">{s.coaches.map(c=>c.fullName).join(", ") || "Тренер не назначен"}</span></span>
                <SessionStatus session={s}/>
              </button>
            </article>)}
            {view === "month" && items.length > 3 && <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={()=>setExpandedDays(prev=>expanded?prev.filter(d=>d!==day):[...prev,day])}>{expanded ? "Свернуть" : `Ещё ${items.length-3}`}</Button>}
            {!items.length && <p className="calendar-day-placeholder">Нет занятий</p>}
          </div>
        </section>;
      })}
    </div>
  </div>;
}


function EventCard({entry, selectedId, onOpen}: {entry: TimelineEntry; selectedId?: string | null; onOpen: (s: WorkspaceSession)=>void}) {
  const s = entry.session;
  return <button type="button" className="calendar-event" data-status={s.effectiveStatus} aria-pressed={selectedId===s.id}
    onClick={()=>onOpen(s)} aria-label={`${sessionTimeLabel(s.startsAt)} · ${s.groupName} · ${sessionStatusLabels[s.effectiveStatus]}`}>
    <span className="calendar-event-time">{sessionTimeLabel(s.startsAt)}–{sessionTimeLabel(s.endsAt)}</span>
    <span className="calendar-event-name">{s.groupName}</span>
    <span className="calendar-event-coach">{s.coaches.map(c=>c.fullName).join(", ") || "Тренер не назначен"}</span>
    <span className="calendar-event-bottom"><Users className="size-3" aria-hidden="true"/>{s.participantsCount}<span className="sr-only"> участников · </span><span className="calendar-event-state">{sessionStatusLabels[s.effectiveStatus]}</span></span>
  </button>;
}

function OverlappingSessions({entries,selectedId,onOpen}: {entries:TimelineEntry[];selectedId?:string|null;onOpen:(s:WorkspaceSession)=>void}) {
  const [open,setOpen]=useState(false);
  const selected=entries.find(e=>e.session.id===selectedId);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button type="button" className="calendar-event calendar-event-cluster" aria-pressed={Boolean(selected)} aria-label={`${sessionTimeLabel(entries[0].session.startsAt)} · Одновременные занятия: ${entries.length}`}>
      <span className="calendar-event-time">{sessionTimeLabel(entries[0].session.startsAt)}</span><span className="calendar-event-name">Занятий: {entries.length}</span><span className="calendar-event-coach">{selected?.session.groupName || "Открыть список"}</span><span className="calendar-event-bottom"><Users className="size-3" aria-hidden="true"/>В одно время</span>
    </button></PopoverTrigger>
    <PopoverContent align="start" className="max-h-80 w-80 overflow-y-auto">
      <div className="calendar-workspace flex flex-col gap-3"><h3 className="text-sm font-semibold">Одновременные занятия · {entries.length}</h3>
        {entries.map(({session:s})=><button type="button" className="calendar-overlap-option" key={s.id} data-session-id={s.id} onClick={()=>{setOpen(false);onOpen(s);}}>
          <span className="font-medium">{s.groupName}</span><span className="calendar-muted text-xs">{sessionTimeLabel(s.startsAt)}–{sessionTimeLabel(s.endsAt)} · {s.coaches.map(c=>c.fullName).join(", ")}</span><SessionStatus session={s}/>
        </button>)}
      </div>
    </PopoverContent>
  </Popover>;
}

function WeekTimeline({days,sessions,selectedId,onOpen}: {days:string[];sessions:WorkspaceSession[];selectedId?:string|null;onOpen:(s:WorkspaceSession)=>void}) {
  const viewport = useRef<HTMLDivElement>(null);
  const columns = days.map(day=>({day,entries:dayEntries(sessions,day)}));
  const bounds = timelineBounds(columns.flatMap(c=>c.entries));
  const hourHeight = 64, height = (bounds.end-bounds.start)/60*hourHeight;
  const hours = Array.from({length:(bounds.end-bounds.start)/60},(_,i)=>bounds.start/60+i);
  const scrollTarget = selectedId || columns.flatMap(c=>c.entries).find(e=>e.session.sessionDate===businessDate())?.session.id || sessions[0]?.id;
  useEffect(()=>{
    const scroll=viewport.current;
    const card=Array.from(scroll?.querySelectorAll<HTMLElement>("[data-session-id], [data-session-ids]") || []).find(element=>element.dataset.sessionId===scrollTarget || element.dataset.sessionIds?.split(" ").includes(scrollTarget));
    if(!scroll || !card)return;
    scroll.scrollTop=Math.max(0,card.offsetTop-64);
    scroll.scrollLeft=scroll.clientWidth<800 ? Math.max(0,(card.parentElement?.offsetLeft || 0)-scroll.offsetLeft-54) : 0;
  },[scrollTarget,days[0]]);
  const template = "54px repeat(7,minmax(100px,1fr))";
  return <div className="calendar-surface">
    <div ref={viewport} className="calendar-timeline-scroll" tabIndex={0} role="region" aria-label="Недельная сетка занятий. Прокрутка по горизонтали">
      <div className="calendar-timeline" style={{gridTemplateColumns:template}}>
        <div className="calendar-time-heading" aria-hidden="true">ALMT</div>
        {columns.map(c=><div key={c.day} className="calendar-time-heading" data-today={c.day===businessDate()}>
          <strong>{new Intl.DateTimeFormat("ru-RU",{weekday:"short",timeZone:"UTC"}).format(new Date(`${c.day}T12:00:00Z`))}</strong>
          <span><b>{Number(c.day.slice(8))}</b> {new Intl.DateTimeFormat("ru-RU",{month:"short",timeZone:"UTC"}).format(new Date(`${c.day}T12:00:00Z`))}</span>
        </div>)}
        <div className="calendar-hours" style={{height}} aria-hidden="true">{hours.map(hour=><span key={hour} style={{top:(hour-bounds.start/60)*hourHeight}}>{String(hour).padStart(2,"0")}:00</span>)}</div>
        {columns.map(c=><section key={c.day} aria-label={calendarDateLabel(c.day)} className="calendar-time-column" data-today={c.day===businessDate()} style={{height,"--hour-height":`${hourHeight}px`} as React.CSSProperties}>
          {!c.entries.length && <span className="sr-only">Нет занятий</span>}
          {timelineBlocks(c.entries).map(block=><article key={block.entries[0].session.id} data-session-id={block.entries.length===1?block.entries[0].session.id:undefined} data-session-ids={block.entries.length>1?block.entries.map(e=>e.session.id).join(" "):undefined} style={{
            top:(block.start-bounds.start)/60*hourHeight,
            height:(Math.min(bounds.end,block.end)-block.start)/60*hourHeight-4,left:3,width:"calc(100% - 6px)"
          }}>{block.entries.length===1?<EventCard entry={block.entries[0]} onOpen={onOpen} selectedId={selectedId}/>:<OverlappingSessions entries={block.entries} selectedId={selectedId} onOpen={onOpen}/>}</article>)}
        </section>)}
      </div>
    </div>
    <div className="calendar-legend" aria-label="Обозначения статусов">{Object.entries(sessionStatusLabels).map(([key,label])=><span key={key} className="calendar-status" data-status={key}><span/>{label}</span>)}</div>
  </div>;
}

export function sessionMenu(s:WorkspaceSession, onAction:(s:WorkspaceSession,a:SessionAction)=>void, returnTo:string) {
  return [
    {key:"open",label:"Открыть занятие",to:`/admin/groups/${s.groupId}/sessions/${s.id}?returnTo=${encodeURIComponent(returnTo)}`},
    ...(s.capabilities.canOpenAttendance ? [{key:"attendance",label:"Открыть журнал",to:`/admin/groups/${s.groupId}/sessions/${s.id}/attendance?returnTo=${encodeURIComponent(returnTo)}`}] : []),
    ...(s.capabilities.canReschedule ? [{key:"reschedule",label:"Перенести занятие",onSelect:()=>onAction(s,"reschedule")}] : []),
    ...(s.capabilities.canSubstituteCoach ? [{key:"coach",label:"Заменить тренера",onSelect:()=>onAction(s,"substitute")}] : []),
    ...(s.capabilities.canCancel ? [{key:"cancel",label:"Отменить занятие",danger:true,separatorBefore:true,onSelect:()=>onAction(s,"cancel")}] : []),
  ];
}
function SessionList({days,sessions,selectedId,onOpen,onAction,returnTo}: {
  days:string[];sessions:WorkspaceSession[];selectedId?:string|null;onOpen:(s:WorkspaceSession)=>void;
  onAction?: (s:WorkspaceSession,a:SessionAction)=>void;returnTo:string;
}) {
  return <div className="calendar-surface calendar-session-list"><Table aria-label="Список занятий">
    <TableHeader><TableRow>{["Время","Группа","Тренер","Ученики","Площадка","Статус",""].map((label,i)=><TableHead key={i} scope="col">{label || <span className="sr-only">Действия</span>}</TableHead>)}</TableRow></TableHeader>
    <TableBody>{[...days].reverse().map(day=>{
      const items = sessions.filter(s=>s.sessionDate===day);
      if (!items.length) return null;
      return <React.Fragment key={day}><TableRow className="calendar-list-date"><TableCell colSpan={7}><div><strong>{calendarDateLabel(day)}</strong><span>{day===businessDate() ? "Сегодня · " : ""}{items.length} зан.</span></div></TableCell></TableRow>
        {items.map(s=><TableRow key={s.id} data-session-id={s.id} data-selected={selectedId===s.id} data-status={s.effectiveStatus}>
          <TableCell className="whitespace-nowrap tabular-nums">{sessionTimeLabel(s.startsAt)}–{sessionTimeLabel(s.endsAt)}</TableCell>
          <TableCell><button type="button" className="calendar-list-open" aria-pressed={selectedId===s.id} aria-label={`Посмотреть ${s.groupName}, ${sessionTimeLabel(s.startsAt)}`} onClick={()=>onOpen(s)}>{s.groupName}</button></TableCell>
          <TableCell>{s.coaches.map(c=>c.fullName).join(", ") || "Не назначен"}</TableCell><TableCell>{s.participantsCount}</TableCell>
          <TableCell>{s.location?.name || <span className="calendar-muted">Не указана</span>}</TableCell><TableCell><SessionStatus session={s}/></TableCell>
          <TableCell>{onAction && <ActionMenu compact label={`Действия: ${s.groupName}, ${sessionTimeLabel(s.startsAt)}`} items={sessionMenu(s,onAction,returnTo)}/>}</TableCell>
        </TableRow>)}</React.Fragment>;
    })}</TableBody>
  </Table></div>;
}

export function SessionPreview({session, returnTo, onClose, onAction, branchName, inline = false}: {
  session: WorkspaceSession; returnTo: string; onClose: ()=>void; onAction?: (s:WorkspaceSession,a:SessionAction)=>void; branchName?:string; inline?: boolean;
}) {
  const [desktop,setDesktop] = useState(()=>window.matchMedia("(min-width: 1100px)").matches);
  useEffect(()=>{const media=window.matchMedia("(min-width: 1100px)");const change=()=>setDesktop(media.matches);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);},[]);
  const detail = `/admin/groups/${session.groupId}/sessions/${session.id}?returnTo=${encodeURIComponent(returnTo)}`;
  const attendance = `/admin/groups/${session.groupId}/sessions/${session.id}/attendance?returnTo=${encodeURIComponent(returnTo)}`;
  const body = <div className="calendar-workspace calendar-preview-body">
    <p className="calendar-preview-date">{calendarDateLabel(session.sessionDate)}<br/>{sessionTimeLabel(session.startsAt)}–{sessionTimeLabel(session.endsAt)} · Алматы</p>
    <SessionStatus session={session}/>
    <dl className="calendar-preview-meta">
      <div><UserRound aria-hidden="true"/><dt>Тренер</dt><dd>{session.coaches.map(c=>c.fullName).join(", ") || "Не назначен"}</dd></div>
      <div><Users aria-hidden="true"/><dt>Ученики</dt><dd>{session.participantsCount}{session.capabilities.canOpenAttendance && <Link className="calendar-link block mt-1" to={attendance}>Посмотреть список</Link>}</dd></div>
      <div><MapPin aria-hidden="true"/><dt>Площадка</dt><dd>{session.location?.name || "Не указана"}</dd></div>
      <div><ClipboardList aria-hidden="true"/><dt>Группа</dt><dd><Link className="calendar-link" to={`/admin/groups/${session.groupId}/schedule`}>{session.groupName}</Link></dd></div>
      {branchName && <div><Building2 aria-hidden="true"/><dt>Филиал</dt><dd>{branchName}</dd></div>}
    </dl>
    {session.cancelReason && <p className="calendar-note">Причина отмены: {session.cancelReason==="Schedule changed" ? "Изменено расписание группы" : session.cancelReason}</p>}
    {session.effectiveStatus==="OVERDUE" && <p className="calendar-note">Время прошло, но занятие не закрыто. Проверьте журнал и результат занятия.</p>}
    <div className="flex flex-col gap-2"><ShadcnButton asChild><Link to={detail}>Открыть занятие</Link></ShadcnButton>{session.capabilities.canOpenAttendance && <ShadcnButton variant="secondary" asChild><Link to={attendance}>Открыть журнал</Link></ShadcnButton>}</div>
    {onAction && <div className="flex flex-col items-start gap-1">
      {session.capabilities.canSubstituteCoach && <Button variant="ghost" onClick={()=>onAction(session,"substitute")}><Pencil data-icon="inline-start"/>Заменить тренера</Button>}
      {session.capabilities.canReschedule && <Button variant="ghost" onClick={()=>onAction(session,"reschedule")}><CalendarDays data-icon="inline-start"/>Перенести занятие</Button>}
      {session.capabilities.canCancel && <Button variant="danger" onClick={()=>onAction(session,"cancel")}><Ban data-icon="inline-start"/>Отменить занятие</Button>}
    </div>}
  </div>;
  if (inline && desktop) return <aside className="calendar-inspector calendar-surface" aria-label="Просмотр занятия" onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();onClose();}}}>
    <div className="calendar-inspector-heading"><h2>{session.groupName}</h2><Button size="sm" variant="ghost" aria-label="Закрыть просмотр" onClick={onClose}><X data-icon="inline-start"/></Button></div>{body}
  </aside>;
  return <ModalShell title={session.groupName} placement="right" maxWidthClassName="max-w-[400px]" onClose={onClose}>{body}</ModalShell>;
}
