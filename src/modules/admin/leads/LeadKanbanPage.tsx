import React, { useEffect, useState, useMemo } from "react";
import {
  ArrowUpRight, Search, RefreshCw, Bookmark, Columns3, List, SlidersHorizontal,
  ListFilter,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  Skeleton,
} from "../../../shared/ui";
import { useAdminBranch } from "../BranchContext";
import LeadKanbanColumn from "./LeadKanbanColumn";
import {
  Lead,
  LeadAction,
  LeadKanbanColumns,
  LeadLossReason,
  LEAD_COLUMN_ORDER,
  LeadColumnStatus,
} from "./types";
import { LeadApi } from "./lead.api";
import { matchesCreatedPeriod } from "./lead.workspace";
import QualifyLeadModal from "./QualifyLeadModal";
import ScheduleTrialModal from "./ScheduleTrialModal";
import AdminCreateLeadModal from "./AdminCreateLeadModal";
import LeadLossModal from "./LeadLossModal";
import { TrialsApi } from "../trials/trials.api";
import {
  getLeadActionEvent,
  getLeadLossStage,
  isConvertAction,
  isLossAction,
  isQualifyAction,
  isScheduleTrialAction,
  getConvertibleParticipants,
  getConvertedParticipants,
} from "./lead.ui-actions";

const COLUMN_TITLES: Record<LeadColumnStatus, string> = {
  NEW: "Новые",
  IN_PROGRESS: "В работе",
  TRIAL_SCHEDULED: "Пробное назначено",
  DECISION_PENDING: "Ожидают решения",
  CONTRACT_PENDING: "Оформление договора",
  PAYMENT_PENDING: "Ожидают оплату",
};

const COLUMN_COLORS: Record<
  LeadColumnStatus,
  {
    column: string;
    header: string;
    badge: string;
  }
> = {
  NEW: {
    column: "bg-slate-50/90 border-slate-200",
    header: "bg-slate-100/90 text-slate-700 border-slate-200",
    badge: "bg-slate-200 text-slate-700",
  },
  IN_PROGRESS: {
    column: "bg-blue-50/90 border-blue-200",
    header: "bg-blue-100/90 text-blue-700 border-blue-200",
    badge: "bg-blue-200 text-blue-700",
  },
  TRIAL_SCHEDULED: {
    column: "bg-amber-50/90 border-amber-200",
    header: "bg-amber-100/90 text-amber-700 border-amber-200",
    badge: "bg-amber-200 text-amber-700",
  },
  DECISION_PENDING: {
    column: "bg-violet-50/90 border-violet-200",
    header: "bg-violet-100/90 text-violet-700 border-violet-200",
    badge: "bg-violet-200 text-violet-700",
  },
  CONTRACT_PENDING: {
    column: "bg-cyan-50/90 border-cyan-200",
    header: "bg-cyan-100/90 text-cyan-700 border-cyan-200",
    badge: "bg-cyan-200 text-cyan-700",
  },
  PAYMENT_PENDING: {
    column: "bg-orange-50/90 border-orange-200",
    header: "bg-orange-100/90 text-orange-700 border-orange-200",
    badge: "bg-orange-200 text-orange-700",
  },
};

const createEmptyColumns = (): LeadKanbanColumns =>
  LEAD_COLUMN_ORDER.reduce<LeadKanbanColumns>((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});

import { InputGroup, InputGroupInput, InputGroupAddon } from "../../../shared/ui/shadcn/input-group";
import LeadList from "./LeadList";
import LeadPreview from "./LeadPreview";
import { ToggleGroup, ToggleGroupItem } from "../../../shared/ui/shadcn/toggle-group";
import { STATUS_LABELS, sourceLabel, matchesSearch, summarize, isActiveLead, overdue, businessDate } from "./lead.workspace";
import LeadWorkModal from "./LeadWorkModal";

const LeadKanbanPage: React.FC = () => {
  const { user } = useAuth();
  const { branchId, branchName } = useAdminBranch();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [workLead, setWorkLead] = useState<Lead | null>(null);
  const [workMode, setWorkMode] = useState<"CONTACT" | "PLAN">("PLAN");
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [savedView, setSavedView] = useState("");
  const view = params.get("view") === "board" ? "board" : "list";
  const setFilters = (values: Record<string, string>) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      Object.entries(values).forEach(([key, value]) => {
        if (!value || (value === "ALL" && key !== "scope")) next.delete(key);
        else next.set(key, value);
      });
      return next;
    }, { replace: true });
    setVisibleLimit(40);
  };
  const setFilter = (key: string, value: string) => setFilters({ [key]: value });
  const openLead = (id: string, action?: LeadAction) => navigate(`/admin/leads/${encodeURIComponent(id)}`, {
    state: { returnTo: `/admin/leads?${params}`, initialAction: action },
  });
  useEffect(() => {
    try { setSavedView(localStorage.getItem(`lead-view:${branchId}`) || ""); } catch { setSavedView(""); }
  }, [branchId]);
  const saveView = () => {
    try { localStorage.setItem(`lead-view:${branchId}`, params.toString()); setSavedView(params.toString()); toast.success("Фильтры сохранены на этом устройстве"); }
    catch { toast.error("Браузер не разрешил сохранить фильтры"); }
  };

  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [columns, setColumns] = useState<LeadKanbanColumns>(createEmptyColumns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qualifyingLead, setQualifyingLead] = useState<Lead | null>(null);
  const [trialLead, setTrialLead] = useState<Lead | null>(null);
  // The dashboard and direct links open the same form as the local create button.
  const showCreateModal = params.get("action") === "create";
  const setShowCreateModal = (open: boolean) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      if (open) next.set("action", "create");
      else next.delete("action");
      return next;
    }, { replace: true });
  };
  const [rejectingLead, setRejectingLead] = useState<Lead | null>(null);
  const [rejectingAction, setRejectingAction] = useState<LeadAction | null>(null);
  const [lossReasons, setLossReasons] = useState<LeadLossReason[]>([]);
  const [lossReasonsLoading, setLossReasonsLoading] = useState(false);
  const [lossReasonsError, setLossReasonsError] = useState<string | null>(null);
  const [rejectSubmitLoading, setRejectSubmitLoading] = useState(false);
  const [actionState, setActionState] = useState<{
    leadId: string;
    actionType: string;
  } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const statusFilter = params.get("status") || "ALL";
  const leadTypeFilter = params.get("type") || "ALL";

  useEffect(() => {
    let isMounted = true;

    const loadKanban = async () => {
      if (!token || !branchId) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const incoming = await LeadApi.getKanban(branchId, token);
        if (!isMounted) return;

        const nextColumns = createEmptyColumns();

        Object.entries(incoming).forEach(([status, leads]) => {
          nextColumns[status] = Array.isArray(leads) ? leads : [];
        });

        setColumns(nextColumns);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить канбан лидов");
        setColumns(createEmptyColumns());
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadKanban();

    return () => {
      isMounted = false;
    };
  }, [token, branchId]);

  const refreshKanban = async () => {
    if (!token || !branchId) return;

    setError(null);

    try {
      const incoming = await LeadApi.getKanban(branchId, token);
      const nextColumns = createEmptyColumns();

      Object.entries(incoming).forEach(([status, leads]) => {
        nextColumns[status] = Array.isArray(leads) ? leads : [];
      });

      setColumns(nextColumns);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить канбан лидов");
    }
  };

  const allLeads = useMemo(() => Object.values(columns).flat(), [columns]);
  const search = params.get("q") || "";
  const owner = params.get("owner") || "ALL";
  const source = params.get("source") || "ALL";
  const period = params.get("period") || "ALL";
  const taskFilter = params.get("task") || "ALL";
  const scope = params.get("scope") || "ACTIVE";
  const today = businessDate();
  const commonLeads = allLeads.filter(lead =>
    matchesSearch(lead, search) &&
    (leadTypeFilter === "ALL" || lead.leadType === leadTypeFilter) &&
    (owner === "ALL" || (owner === "UNASSIGNED" ? !lead.assignedAdmin : lead.assignedAdmin?.id === owner)) &&
    (source === "ALL" || lead.source === source) &&
    matchesCreatedPeriod(lead.createdAt, period, today)
  );
  const metrics = summarize(commonLeads);
  const preview = allLeads.find(l => l.id === previewId);
  const queue = scope === "CLOSED" ? "CLOSED" : statusFilter === "NEW" ? "NEW" : taskFilter === "OVERDUE" ? "OVERDUE" : scope === "ALL" ? "ALL" : "ACTIVE";
  const chooseQueue = (value: string) => setFilters({ scope: value === "CLOSED" ? "CLOSED" : value === "ALL" ? "ALL" : "ACTIVE", status: value === "NEW" ? "NEW" : "ALL", task: value === "OVERDUE" ? "OVERDUE" : "ALL", view: value === "CLOSED" || value === "ALL" ? "list" : view });
  const filteredLeads = commonLeads.filter(lead =>
    (scope === "ALL" || (scope === "CLOSED" ? !isActiveLead(lead) : isActiveLead(lead))) &&
    (statusFilter === "ALL" || lead.status === statusFilter) &&
    (taskFilter === "ALL" || (taskFilter === "OVERDUE" ? overdue(lead)
      : taskFilter === "TRIAL_TODAY" ? (lead.currentTrials ?? []).some(t => t.status === "SCHEDULED" && t.sessionDate === today)
      : taskFilter === "NO_TASK" ? isActiveLead(lead) && !lead.work?.nextAction
      : isActiveLead(lead) && ["HIGH", "URGENT"].includes(lead.work?.priority || "")))
  ).sort((a, b) => Number(overdue(b)) - Number(overdue(a))
    || ({"NORMAL": 0, "HIGH": 1, "URGENT": 2}[b.work?.priority ?? "NORMAL"] - {"NORMAL": 0, "HIGH": 1, "URGENT": 2}[a.work?.priority ?? "NORMAL"])
    || b.createdAt.localeCompare(a.createdAt));
  const visibleColumns = LEAD_COLUMN_ORDER.reduce<LeadKanbanColumns>((acc, status) => {
    acc[status] = filteredLeads.filter(lead => lead.status === status);
    return acc;
  }, createEmptyColumns());
  const activeFilterCount = ["q", "status", "type", "owner", "source", "period", "task"].filter(k => params.has(k)).length;
  const owners = Array.from(new Map(allLeads.flatMap(l => l.assignedAdmin ? [[l.assignedAdmin.id, l.assignedAdmin] as const] : [])).values());
  const sources = Array.from(new Set(allLeads.map(l => l.source).filter(Boolean)));
  const selectClass = "h-9 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus-visible:outline-blue-600";
  const contact = (lead: Lead) => { setWorkMode("CONTACT"); setWorkLead(lead); };

  const handleLeadAction = async (lead: Lead, action: LeadAction) => {
    if (!token || !action.enabled) return;
    if (action.type === "CONTACT_LEAD" || action.type === "CONTACT") { contact(lead); return; }

    if (isQualifyAction(action)) {
      setQualifyingLead(lead);
      return;
    }

    if (isScheduleTrialAction(action)) {
      setTrialLead(lead);
      return;
    }

    if (isConvertAction(action)) {
      const convertibleParticipants = getConvertibleParticipants(lead);

      if (convertibleParticipants.length === 0) {
        toast("Нет участников, готовых к оформлению");
      } else {
        openLead(lead.id, action);
      }

      return;
    }

    if (action.type === "CREATE_CONTRACT") {
      const convertedParticipant = getConvertedParticipants(lead)[0];

      if (!lead.clientId || !convertedParticipant?.playerId) {
        toast.error(
          "Для создания договора сначала должны быть оформлены клиент и ученик"
        );
        return;
      }

      navigate(
        `/admin/contracts?drawer=create-contract` +
          `&clientId=${encodeURIComponent(lead.clientId)}` +
          `&playerId=${encodeURIComponent(convertedParticipant.playerId)}` +
          `&leadId=${encodeURIComponent(lead.id)}`
      );
      return;
    }

    if (action.type === "RECORD_PAYMENT") {
      if (!lead.clientId) {
        toast.error("У лида не указан клиент");
        return;
      }

      navigate(`/admin/clients/${encodeURIComponent(lead.clientId)}/payments`);
      return;
    }

    if (isLossAction(action)) {
      setRejectingLead(lead);
      setRejectingAction(action);
      if (!lossReasonsLoading) {
        setLossReasonsLoading(true);
        setLossReasonsError(null);
        try {
          const reasons = await LeadApi.getLeadLossReasons(
            token,
            getLeadLossStage(action, lead.status)
          );
          setLossReasons(reasons);
        } catch (err) {
          console.error(err);
          setLossReasonsError("Не удалось загрузить причины потери");
        } finally {
          setLossReasonsLoading(false);
        }
      }
      return;
    }

    if (action.type === "MARK_TRIAL_DONE") {
      setActionState({ leadId: lead.id, actionType: action.type });
      setError(null);
      try {
        const trial = await TrialsApi.findByLead(lead.id);
        if (!trial) throw new Error("Пробное занятие не найдено");
        await TrialsApi.markAttendance(trial.id, "ATTENDED");

        await refreshKanban();
        toast.success("Посещение пробного отмечено");
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Не удалось отметить пробное");
      } finally {
        setActionState(null);
      }
      return;
    }

    setActionState({ leadId: lead.id, actionType: action.type });
    setError(null);

    try {
      await LeadApi.sendLeadEvent(
        lead.id,
        { event: getLeadActionEvent(action) },
        token
      );
      await refreshKanban();
      toast.success("Статус лида обновлён");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось обновить лид");
    } finally {
      setActionState(null);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  if (!branchId) {
    return (
      <PageShell>
        <EmptyState
          title="Сначала выберите филиал"
          description="Канбан лидов доступен после выбора рабочего филиала."
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="min-w-0 max-w-[1540px] !gap-3 sm:!gap-5">
      <PageHeader title="Лиды" className="!flex-row items-center [&_p]:hidden sm:[&_p]:block" description="От первого обращения до первого занятия."
        actions={<Button type="button" onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4" />Новый лид</Button>}
      />
      <section aria-label="Обзор лидов" className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="hidden text-xs font-semibold text-slate-700 md:block">Обзор воронки</h2>
          <button type="button" className="flex w-full items-center justify-between gap-2 text-sm text-slate-700 md:hidden" aria-expanded={metricsExpanded} aria-controls="lead-metrics" onClick={() => setMetricsExpanded(v => !v)}><span>Обзор · в работе {metrics.active}</span><span className="text-xs">{metricsExpanded ? "Свернуть ↑" : "Показать ↓"}</span></button>
          <label className={`${metricsExpanded ? "flex" : "hidden"} items-center gap-2 text-xs text-slate-500 md:flex`}>Созданы<select className="max-w-full border-0 bg-transparent text-xs font-medium text-slate-700 focus-visible:outline-blue-600" value={period} onChange={e => setFilter("period", e.target.value)}><option value="ALL">За всё время</option><option value="TODAY">Сегодня</option><option value="MONTH">В этом месяце</option><option value="LAST_28_DAYS">За последние 28 дней</option></select></label>
        </div>
        <div id="lead-metrics" className={`${metricsExpanded ? "grid" : "hidden"} grid-cols-2 divide-x divide-slate-100 md:grid lg:grid-cols-4`} aria-busy={loading}>
          {[
            { label: "В работе", value: metrics.active, hint: `Новых заявок: ${metrics.newCount}`, action: () => chooseQueue("ACTIVE"), alert: false },
            { label: "Требуют внимания", value: metrics.overdue, hint: `Без плана: ${metrics.withoutTask}`, action: () => chooseQueue("OVERDUE"), alert: metrics.overdue > 0 },
            { label: "Пробные сегодня", value: metrics.trialsToday, hint: `${today} · Алматы`, action: () => { setFilters({ scope: "ALL", status: "ALL", task: "TRIAL_TODAY" }); }, alert: false },
            { label: "Конверсия в клиента", value: metrics.conversion === null ? "—" : `${metrics.conversion}%`, hint: `${metrics.converted} из ${metrics.total} лидов`, action: () => setFilters({ scope: "CLOSED", status: "CONVERTED", task: "ALL", view: "list" }), alert: false },
          ].map(({label, value, hint, action, alert}) => <button type="button" key={label} onClick={action} disabled={loading || Boolean(error)} className="group min-w-0 p-4 text-left transition hover:bg-slate-50 focus-visible:outline-blue-600 sm:px-5">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500"><span>{label}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400" /></div>
            <div className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${alert ? "text-rose-700" : "text-slate-900"}`}>{loading || error ? "—" : value}</div>
            <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
          </button>)}
        </div>
      </section>
      {error ? <ErrorState message={error} onRetry={refreshKanban} /> : null}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Рабочий список лидов">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 pt-2">
          <div className="min-w-0">
            <ToggleGroup type="single" value={queue} onValueChange={value => { if (value) chooseQueue(value); }} aria-label="Очередь лидов" className="h-11 max-w-full justify-start gap-3 overflow-x-auto rounded-none bg-transparent p-0">
              {[{id:"ACTIVE", label:"Активные", count:metrics.active},{id:"NEW",label:"Новые",count:metrics.newCount},{id:"OVERDUE",label:"Просрочено",count:metrics.overdue},{id:"CLOSED",label:"Завершённые",count:commonLeads.length-metrics.active},{id:"ALL",label:"Все",count:commonLeads.length}].map(item => <ToggleGroupItem key={item.id} value={item.id} className="h-11 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent !bg-transparent px-1 text-xs !shadow-none data-[state=on]:border-blue-600 data-[state=on]:!text-blue-700">{item.label}<span className="rounded px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">{item.count}</span></ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <div className="mb-2">
            <ToggleGroup type="single" value={scope === "ACTIVE" ? view : "list"} onValueChange={value => { if(value) setFilter("view", value); }} aria-label="Вид лидов" className="h-8 rounded-lg bg-slate-100 p-0.5"><ToggleGroupItem value="list" className="h-7 gap-1.5 px-2.5 text-xs"><List className="h-3.5 w-3.5"/>Список</ToggleGroupItem><ToggleGroupItem value="board" disabled={scope !== "ACTIVE"} className="h-7 gap-1.5 px-2.5 text-xs text-slate-700 disabled:opacity-40"><Columns3 className="h-3.5 w-3.5"/>Воронка</ToggleGroupItem></ToggleGroup>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <InputGroup className="h-9 min-w-[180px] flex-1 sm:max-w-xs">
            <InputGroupAddon><Search className="h-4 w-4"/></InputGroupAddon>
            <InputGroupInput aria-label="Поиск по лидам" type="search" value={search} onChange={e => setFilter("q", e.target.value)} placeholder="Имя, телефон, email…" className="text-xs" />
          </InputGroup>
          <Button type="button" variant="secondary" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setFiltersOpen(v => !v)} aria-expanded={filtersOpen}><SlidersHorizontal className="h-3.5 w-3.5"/>Фильтры{activeFilterCount > 0 && <span className="text-blue-700">· {activeFilterCount}</span>}</Button>
          <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-xs" onClick={saveView}><Bookmark className="h-3.5 w-3.5"/>Сохранить вид</Button>
          {savedView && <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setParams(savedView); setVisibleLimit(40); }}>Мой вид</Button>}
          <div role="status" className="ml-auto text-xs tabular-nums text-slate-500">{loading ? "Загрузка…" : `Найдено: ${filteredLeads.length}`}</div>
          <Button variant="ghost" size="sm" disabled={loading} aria-label="Обновить лиды" className="h-8 w-8 p-0" onClick={() => void refreshKanban()}><RefreshCw className="h-3.5 w-3.5"/></Button>
        </div>
        {filtersOpen && <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/70 p-4" aria-label="Дополнительные фильтры">
          <label className="grid gap-1 text-[11px] text-slate-500">Показывать<select className={selectClass} value={scope} onChange={e => setFilters({scope:e.target.value,status:"ALL",task:"ALL",view:"list"})}><option value="ACTIVE">Активные</option><option value="CLOSED">Завершённые и отказы</option><option value="ALL">Все лиды</option></select></label>
          <label className="grid gap-1 text-[11px] text-slate-500">Стадия<select className={selectClass} value={statusFilter} onChange={e => setFilter("status", e.target.value)}><option value="ALL">Все стадии</option>{Object.entries(STATUS_LABELS).filter(([status]) => scope === "ALL" || (scope === "CLOSED" ? ["LOST","CONVERTED"].includes(status) : !["LOST","CONVERTED"].includes(status))).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-[11px] text-slate-500">Задачи<select className={selectClass} value={taskFilter} onChange={e => setFilter("task", e.target.value)}><option value="ALL">Все задачи</option><option value="TRIAL_TODAY">Пробные сегодня</option><option value="OVERDUE">Просроченные</option><option value="NO_TASK">Без следующего действия</option><option value="HIGH">Высокий приоритет</option></select></label>
          <label className="grid gap-1 text-[11px] text-slate-500">Тип<select className={selectClass} value={leadTypeFilter} onChange={e => setFilter("type", e.target.value)}><option value="ALL">Все типы</option><option value="CHILDREN">Детский</option><option value="ADULT">Взрослый</option></select></label>
          <label className="grid gap-1 text-[11px] text-slate-500">Ответственный<select className={selectClass} value={owner} onChange={e => setFilter("owner", e.target.value)}><option value="ALL">Все администраторы</option><option value="UNASSIGNED">Не назначен</option>{owners.map(o => <option key={o.id} value={o.id}>{o.name || o.email}</option>)}</select></label>
          <label className="grid gap-1 text-[11px] text-slate-500">Источник<select className={selectClass} value={source} onChange={e => setFilter("source", e.target.value)}><option value="ALL">Все источники</option>{sources.map(value => <option key={value} value={value!}>{sourceLabel(value)}</option>)}</select></label>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setParams({}); setVisibleLimit(40); }}>Сбросить всё</Button>
        </div>}
        {activeFilterCount > 0 && !filtersOpen && <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-500"><ListFilter className="h-3 w-3"/>Применены фильтры: {activeFilterCount}<button className="text-blue-700 hover:underline" onClick={() => { setParams({}); setVisibleLimit(40); }}>Сбросить</button></div>}
        {loading ? <div className="grid gap-3 p-4">{Array.from({length:5},(_,i) => <Skeleton key={i} className="h-16 rounded-lg"/>)}</div> : error ? null : filteredLeads.length === 0 ?
          <div className="p-8"><EmptyState title={allLeads.length ? "В этой очереди пока пусто" : "Первый лид — начало нового пути"} description={allLeads.length ? "Измените поиск или сбросьте фильтры, чтобы увидеть другие заявки." : "Добавьте заявку: контакт, участника и интересующий филиал."}/><div className="mt-4 flex justify-center"><Button variant="secondary" onClick={() => allLeads.length ? setParams({}) : setShowCreateModal(true)}>{allLeads.length ? "Показать активные лиды" : "Добавить первый лид"}</Button></div></div> :
          view === "board" && scope === "ACTIVE" ? <div className="flex min-w-0 gap-3 overflow-x-auto bg-slate-50/70 p-4" aria-label="Воронка лидов">
            {LEAD_COLUMN_ORDER.filter(status => statusFilter === "ALL" || statusFilter === status).map(status => <LeadKanbanColumn key={status} title={COLUMN_TITLES[status]} leads={visibleColumns[status] ?? []} theme={COLUMN_COLORS[status]} onLeadClick={setPreviewId} onLeadAction={handleLeadAction} actionState={actionState} />)}
          </div> :
          <LeadList leads={filteredLeads.slice(0,visibleLimit)} onPreview={lead => setPreviewId(lead.id)} onOpen={openLead} onPlan={lead => { setWorkMode("PLAN"); setWorkLead(lead); }} onContact={contact} onAction={handleLeadAction} busyId={actionState?.leadId}/>}
        {!loading && !error && filteredLeads.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500"><span>{view === "list" ? `Показано ${Math.min(visibleLimit,filteredLeads.length)} из ${filteredLeads.length}` : `Всего: ${filteredLeads.length}`} · Сначала просроченные и приоритетные</span>{view === "list" && visibleLimit < filteredLeads.length && <Button variant="secondary" size="sm" onClick={() => setVisibleLimit(v => v+40)}>Показать ещё</Button>}</div>}
      </section>
      <details className="px-1 text-[11px] leading-5 text-slate-600"><summary className="w-fit cursor-pointer hover:text-slate-700">Как считаются показатели</summary><p className="mt-2 max-w-3xl">Показатели учитывают поиск, тип, ответственного, источник и период создания — все стадии, включая завершённые. Очередь и стадия фильтруют список. Конверсия — доля лидов, завершённых после первого платежа. «Требуют внимания» — просроченные задачи; лиды без плана указаны отдельно.</p></details>
      {preview && !workLead && <LeadPreview lead={preview} onClose={() => setPreviewId(null)} onOpen={() => openLead(preview.id)} onPlan={() => { setPreviewId(null); setWorkMode("PLAN"); setWorkLead(preview); }} onContact={() => { setPreviewId(null); contact(preview); }} onTrial={id => navigate(`/admin/trials/${id}`)} onAction={action => { setPreviewId(null); void handleLeadAction(preview,action); }}/>}
      {workLead && <LeadWorkModal lead={workLead} mode={workMode} onClose={() => setWorkLead(null)} onSaved={refreshKanban} />}

      {qualifyingLead ? (
        <QualifyLeadModal
          leadId={qualifyingLead.id}
          token={token}
          initialLead={qualifyingLead}
          onClose={() => setQualifyingLead(null)}
          onSuccess={async () => {
            await refreshKanban();
            setQualifyingLead(null);
          }}
        />
      ) : null}

        {trialLead ? (
          <ScheduleTrialModal
            lead={trialLead}
            branchId={branchId}
            token={token}
            onClose={() => setTrialLead(null)}
            onSuccess={async (trialId) => {
            await refreshKanban();
            setTrialLead(null);
            if (trialId) navigate(`/admin/trials/${trialId}`);
          }}
        />
      ) : null}

      {showCreateModal ? (
        <AdminCreateLeadModal
          branchId={branchId}
          branchName={branchName}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshKanban}
        />
      ) : null}

      {rejectingLead && rejectingAction ? (
        <LeadLossModal
          isOpen={Boolean(rejectingLead && rejectingAction)}
          lead={rejectingLead}
          event={getLeadActionEvent(rejectingAction)}
          reasons={lossReasons}
          loadingReasons={lossReasonsLoading}
          reasonsError={lossReasonsError}
          submitting={rejectSubmitLoading}
          onClose={() => {
            if (rejectSubmitLoading) return;
            setRejectingLead(null);
            setRejectingAction(null);
          }}
          onConfirm={async ({ lostReasonCode, lostComment }) => {
            if (!token || !rejectingLead || !rejectingAction) return;
            setRejectSubmitLoading(true);
            setError(null);
            try {
              await LeadApi.sendLeadEvent(
                rejectingLead.id,
                {
                  event: getLeadActionEvent(rejectingAction),
                  lostReasonCode,
                  lostComment,
                },
                token
              );
              toast.success("Причина потери сохранена");
              setRejectingLead(null);
              setRejectingAction(null);
              await refreshKanban();
            } catch (err) {
              console.error(err);
              setError(
                err instanceof Error
                  ? err.message
                  : "Не удалось сохранить причину потери"
              );
            } finally {
              setRejectSubmitLoading(false);
            }
          }}
        />
      ) : null}
    </PageShell>
  );
};

export default LeadKanbanPage;
