import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, RefreshCw, Search, Settings2, SlidersHorizontal, ArrowUpRight, Plus, TriangleAlert, MapPin, Ban, X } from "lucide-react";
import { useAuth } from "../../shared/AuthContext";
import { addBusinessDays, businessDate } from "../../shared/business-time";
import { Button, EmptyState, ErrorState, LoadingState, ModalShell, NativeSelect, PageHeader, PageShell } from "../../shared/ui";
import { InputGroup, InputGroupInput, InputGroupAddon } from "../../shared/ui/shadcn/input-group";
import { CalendarToolbar, SessionCalendar, SessionPreview, type SessionAction } from "./calendar/SessionCalendar";
import { cn } from "../../shared/ui/utils";
import { useAdminBranch } from "./BranchContext";
import { GroupApi, type GroupApiModel } from "./groups/group.api";
import { AdminSessionApi } from "./groups/session.api";
import { calendarDateLabel, filterSessions, sessionStatusLabels, sessionWeek, validCalendarDate, type WorkspaceSession } from "./sessions.workspace";

import { weekLabel } from "./calendar/timeline";
import { SessionActionDialog } from "./calendar/SessionActionDialog";
import { AddSessionModal } from "./calendar/AddSessionModal";

export default function SchedulePage() {
  const {user} = useAuth();
  const token = user?.accessToken;
  const {branchId, branchName} = useAdminBranch();
  const [params, setParams] = useSearchParams();
  const rawDate = params.get("date");
  const date = validCalendarDate(rawDate) ? rawDate : businessDate();
  const view = params.get("view") === "week" ? "week" : "agenda";
  const group = params.get("group") ?? "";
  const coach = params.get("coach") ?? "";
  const place = params.get("place") ?? "";
  const day = params.get("day") ?? "";
  const query = params.get("q") ?? "";
  const rawStatus = params.get("status") ?? "ALL";
  const status = Object.hasOwn(sessionStatusLabels, rawStatus) ? rawStatus : "ALL";
  const days = useMemo(() => sessionWeek(date), [date]);
  const from = days[0], to = days[6];
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [action, setAction] = useState<{session:WorkspaceSession;type:SessionAction}|null>(null);
  const [cancelledOpen, setCancelledOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const requestKey = `${branchId}:${from}:${to}:${revision}`;
  const [data, setData] = useState<{key: string; groups: GroupApiModel[]; items: WorkspaceSession[]; error: string | null} | null>(null);
  const loading = Boolean(token && branchId && data?.key !== requestKey);
  const current = data?.key === requestKey ? data : null;
  const groups = current?.groups ?? [];
  const items = current?.items ?? [];
  const error = current?.error;

  function update(values: Record<string,string>) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) { if (value) next.set(key,value); else next.delete(key); }
      return next;
    }, {replace: true});
  }

  useEffect(() => {
    if (!token || !branchId) return;
    let active = true;
    async function load() {
      let directory: GroupApiModel[] = [];
      try {
        directory = await GroupApi.listByBranch(branchId!, token!);
        if (!active) return;
        const selected = directory;
        const result: WorkspaceSession[] = [];
        // Bound concurrency; never present incomplete data as a complete calendar.
        for (let i = 0; i < selected.length; i += 5) {
          if (!active) return;
          const batch = await Promise.all(selected.slice(i, i+5).map(async g => {
            const response = await AdminSessionApi.listByGroup(g.groupId, {from,to}, token!);
            return response.items.map(s => ({...s,groupId:g.groupId,groupName:g.name}));
          }));
          result.push(...batch.flat());
        }
        if (active) setData({key: requestKey, groups: directory, items: result, error:null});
      } catch (e) {
        if (active) setData({key: requestKey, groups: directory, items: [], error: e instanceof Error ? e.message : "Не удалось загрузить занятия"});
      }
    }
    void load();
    return () => { active = false; };
  }, [branchId, token, from, to, requestKey]);

  const coaches = [...new Map(items.flatMap(s=>s.coaches).map(c=>[c.id,c])).values()].sort((a,b)=>a.fullName.localeCompare(b.fullName));
  const filtered = filterSessions(items, {status,coach,query,group,place,day});
  const hasFilters = Boolean(group || coach || query || place || day || status !== "ALL");
  const returnTo = `/admin/schedule?${params.toString()}`;
  const settingsUrl = group ? `/admin/groups/${group}/schedule` : "/admin/groups";


  const selectedSession = filtered.find(s => s.id === selectedId);
  const normalisedBranch = branchName === "Main Branch" ? "Главный филиал" : branchName || "Текущий филиал";
  const locations = [...new Map(items.flatMap(s=>s.location ? [s.location] : []).map(l=>[l.id,l])).values()];
  const cancelled = filtered.filter(s=>s.effectiveStatus==="CANCELLED");
  const shown = view==="agenda" && status!=="CANCELLED" && !cancelledOpen ? filtered.filter(s=>s.effectiveStatus!=="CANCELLED") : filtered;
  const emptyFilters = {group:"",coach:"",q:"",status:"",place:"",day:""};
  const clearFilters = ()=>update(emptyFilters);
  const onOpen = (s:WorkspaceSession)=>{opener.current=document.activeElement as HTMLElement;setSelectedId(s.id);};
  const closePreview = ()=>{setSelectedId(null);opener.current?.focus();};
  const onAction = (s:WorkspaceSession,type:SessionAction)=>setAction({session:s,type});
  const chips = [
    {key:"group",label:groups.find(g=>g.groupId===group)?.name || "Группа",value:group},
    {key:"coach",label:coaches.find(c=>c.id===coach)?.fullName || "Тренер",value:coach},
    {key:"status",label:sessionStatusLabels[status as keyof typeof sessionStatusLabels],value:status==="ALL"?"":status},
    {key:"place",label:place==="none"?"Без площадки":locations.find(l=>l.id===place)?.name || "Площадка",value:place},
    {key:"day",label:validCalendarDate(day)?calendarDateLabel(day):"Дата",value:day},
    {key:"q",label:query,value:query},
  ].filter(c=>c.value);
  const metrics = [
    {key:"today",title:"Сегодня",value:items.filter(s=>s.sessionDate===businessDate() && s.effectiveStatus!=="CANCELLED").length,icon:CalendarDays,tone:"info",active:day===businessDate(),run:()=>update({date:businessDate(),day:day===businessDate()?"":businessDate(),status:"",group:"",coach:"",q:"",place:""})},
    {key:"overdue",title:"Требуют закрытия",value:items.filter(s=>s.effectiveStatus==="OVERDUE").length,icon:TriangleAlert,tone:"warning",active:status==="OVERDUE",run:()=>{update({...emptyFilters,status:status==="OVERDUE"?"":"OVERDUE"});}},
    {key:"place",title:"Без площадки",value:items.filter(s=>!s.location).length,icon:MapPin,tone:"info",active:place==="none",run:()=>{update({...emptyFilters,place:place==="none"?"":"none"});}},
    {key:"cancelled",title:"Отменено",value:items.filter(s=>s.effectiveStatus==="CANCELLED").length,icon:Ban,tone:"danger",active:status==="CANCELLED",run:()=>{update({...emptyFilters,status:status==="CANCELLED"?"":"CANCELLED"});}},
  ];
  return <PageShell className="calendar-workspace flex flex-col gap-4">
    <PageHeader title="Занятия" description={`${normalisedBranch} · Время Алматы`}
      actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={()=>setSettingsOpen(true)}><Settings2 data-icon="inline-start"/>Расписание групп</Button><Button disabled={loading || !branchId || Boolean(error)} onClick={()=>setCreateOpen(true)}><Plus data-icon="inline-start"/>Добавить занятие</Button></div>}/>
    <div className={cn("calendar-layout", selectedSession && "calendar-layout--preview")}>
      <div className="calendar-main">
        <div className="calendar-surface">
          <CalendarToolbar date={date} label={weekLabel(from,to)} view={view}
            onView={v=>update({view:v})} onDate={d=>{if(validCalendarDate(d))update({date:d,day:""});}}
            onMove={n=>update({date:addBusinessDays(from,n*7),day:""})} onToday={()=>update({date:businessDate(),day:""})}
            actions={<Button size="sm" variant="ghost" className="sm:hidden" aria-expanded={filtersOpen} aria-controls="session-filters" onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal data-icon="inline-start"/>{filtersOpen?"Скрыть фильтры":"Фильтры"}</Button>}/>
          {view==="agenda" && <div className="calendar-metrics" aria-label="Показатели за выбранную неделю">{metrics.map(m=><button key={m.key} type="button" data-tone={m.tone} aria-pressed={m.active} disabled={loading || Boolean(error)} onClick={m.run}><m.icon aria-hidden="true"/><span><span>{m.title}</span><strong>{loading || error ? "—" : m.value}</strong><small>за выбранную неделю</small></span></button>)}</div>}
          <div id="session-filters" className={cn(filtersOpen ? "block" : "hidden sm:block")}>
            <div className="calendar-filters">
              <InputGroup><InputGroupAddon><Search/></InputGroupAddon><InputGroupInput aria-label="Поиск занятий" placeholder="Группа, тренер, площадка…" value={query} onChange={e=>update({q:e.target.value})}/></InputGroup>
              <NativeSelect aria-label="Группа" value={group} disabled={loading} onChange={e=>update({group:e.target.value})}><option value="">Все группы</option>{groups.map(g=><option key={g.groupId} value={g.groupId}>{g.name}</option>)}{group && !groups.some(g=>g.groupId===group) && <option value={group}>Группа недоступна</option>}</NativeSelect>
              <NativeSelect aria-label="Тренер" value={coach} disabled={loading} onChange={e=>update({coach:e.target.value})}><option value="">Все тренеры</option>{coaches.map(c=><option key={c.id} value={c.id}>{c.fullName}</option>)}{coach && !coaches.some(c=>c.id===coach) && <option value={coach}>Нет занятий тренера</option>}</NativeSelect>
              <NativeSelect aria-label="Статус занятия" value={status} onChange={e=>update({status:e.target.value})}><option value="ALL">Все статусы</option>{Object.entries(sessionStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</NativeSelect>
              <NativeSelect aria-label="Площадка" value={place} onChange={e=>update({place:e.target.value})}><option value="">Все площадки</option><option value="none">Без площадки</option>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}{place && place!=="none" && !locations.some(l=>l.id===place) && <option value={place}>Нет занятий на площадке</option>}</NativeSelect>
            </div>
          </div>
          {chips.length>0 && <div className="calendar-filter-chips"><span>Активные фильтры:</span>{chips.map(c=><Button variant="secondary" size="sm" key={c.key} aria-label={`Убрать фильтр: ${c.label}`} onClick={()=>update({[c.key]:""})}>{c.label}<X data-icon="inline-end"/></Button>)}<Button variant="ghost" size="sm" onClick={clearFilters}>Сбросить фильтры</Button></div>}
        </div>
        <div className="calendar-result-bar"><span role="status">{loading ? "Загружаем занятия…" : error ? "Данные не загружены" : `Показано: ${shown.length} из ${filtered.length}`}</span><Button variant="ghost" size="sm" aria-label="Обновить" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw data-icon="inline-start"/></Button></div>
        {!branchId ? <EmptyState title="Выберите филиал"/> : loading ? <LoadingState label="Загрузка занятий…"/> : error ? <ErrorState message={error} onRetry={()=>setRevision(v=>v+1)}/> : !filtered.length ?
          <EmptyState title={hasFilters?"Занятий по этим фильтрам нет":"На эту неделю занятий нет"} description={hasFilters?"Измените условия поиска или сбросьте фильтры.":"Добавьте занятие или перейдите к другой неделе."} action={<Button variant="secondary" onClick={()=>hasFilters?clearFilters():setCreateOpen(true)}>{hasFilters?"Очистить фильтры":"Добавить занятие"}</Button>}/> :
          shown.length>0 ? <SessionCalendar days={days} sessions={shown} view={view} onOpen={onOpen} selectedId={selectedId} onAction={onAction} returnTo={returnTo}/> : <EmptyState title="В этой выборке только отменённые занятия"/>}
        {view==="agenda" && status!=="CANCELLED" && cancelled.length>0 && <div className="calendar-cancelled-toggle"><span>Отменённые занятия · {cancelled.length}</span><Button size="sm" variant="ghost" aria-expanded={cancelledOpen} onClick={()=>setCancelledOpen(v=>!v)}>{cancelledOpen?"Скрыть отменённые":"Показать отменённые"}</Button></div>}
      </div>
      {selectedSession && <SessionPreview inline session={selectedSession} returnTo={returnTo} onClose={closePreview} onAction={onAction} branchName={normalisedBranch}/>}
    </div>
    {action && token && <SessionActionDialog sessionId={action.session.id} action={action.type} token={token} branchId={branchId} onClose={()=>setAction(null)} onSaved={()=>{setAction(null);setRevision(v=>v+1);}}/>}
    {createOpen && token && <AddSessionModal groups={groups} initialGroup={group} initialDate={date} token={token} onClose={()=>setCreateOpen(false)} onSaved={createdDate=>{setCreateOpen(false);update({...emptyFilters,date:createdDate});setRevision(v=>v+1);}}/>}
    {settingsOpen && <ModalShell title="Расписание групп" description="Выберите группу, чтобы настроить повторяющиеся дни и время занятий." placement="right" maxWidthClassName="max-w-[460px]" onClose={()=>setSettingsOpen(false)}>
      {loading ? <LoadingState label="Группы загружаются…"/> : error ? <ErrorState message={error} onRetry={()=>setRevision(v=>v+1)}/> : groups.length ? <div className="flex flex-col gap-2">{groups.map(g=><Link key={g.groupId} className="calendar-group-link" to={`/admin/groups/${g.groupId}/schedule?section=periods`}><CalendarDays className="size-5"/><span className="min-w-0 flex-1 wrap-break-word">{g.name}<span className="calendar-muted mt-1 block text-xs">{{ACTIVE:"Активная группа",PAUSED:"На паузе",STOPPED:"Остановлена"}[g.status]}</span></span><ArrowUpRight className="size-4"/></Link>)}</div> : <EmptyState title="Групп пока нет" action={<Link className="calendar-link" to={settingsUrl}>Открыть группы</Link>}/>}
    </ModalShell>}
  </PageShell>;
}
